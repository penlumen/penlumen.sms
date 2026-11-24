import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../cache/cache.service.js';
import { DecodedUser } from '../common/types/auth.js';
import { WebhooksService } from '../integrations/webhooks.service.js';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly webhooks: WebhooksService,
  ) {}

  /**
   * Tells connected apps (class.updated) that a class's subjects changed, so
   * an exam app can offer the right subjects for each class.
   */
  private async notifyApps(classUuid: string) {
    const cls = await this.prisma.class.findUnique({
      where: { uuid: classUuid },
      select: {
        uuid: true,
        name: true,
        status: true,
        teacher_uuid: true,
        teachers_uuid: true,
        branch: { select: { uuid: true, school_uuid: true } },
        subjects: {
          select: { uuid: true, name: true, teacher_uuid: true },
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
        },
      },
    });
    if (!cls?.branch) return;
    const { branch, subjects, ...rest } = cls;
    this.webhooks.emit(branch.school_uuid, branch.uuid, 'class.updated', {
      ...rest,
      subjects: subjects.map((s) => s.name),
      subject_teachers: subjects,
    });
  }

  /**
   * The subject's teacher from a request: a staff member of the school, or
   * null to clear it. Undefined leaves it as it is.
   */
  private async teacherFrom(
    decoded: DecodedUser,
    value: unknown,
  ): Promise<string | null | undefined> {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const teacher =
      typeof value === 'string'
        ? await this.prisma.user.findFirst({
            where: {
              uuid: value,
              school_uuid: decoded.school_uuid,
              role: { in: ['ROOT', 'ADMIN', 'STAFF'] },
            },
            select: { uuid: true },
          })
        : null;
    if (!teacher) {
      throw new UnprocessableEntityException({
        status: 422,
        success: false,
        message: 'Choose a teacher from your staff',
      });
    }
    return teacher.uuid;
  }

  private cacheKey(classUuid: string) {
    return `subjects:index:${classUuid}`;
  }

  async index(classUuid: string) {
    const subjects = await this.cache.remember(
      this.cacheKey(classUuid),
      300,
      () =>
        this.prisma.subject.findMany({
          where: { class_uuid: classUuid },
          orderBy: [{ position: 'asc' }, { created_at: 'asc' }],
          include: { teacher: { select: { uuid: true, name: true } } },
        }),
    );
    return {
      status: 200,
      success: true,
      message: 'Subjects retrieved',
      data: { subjects },
    };
  }

  /** Saves the order staff dragged the class's subjects into. */
  async reorder(decoded: DecodedUser, classUuid: string, body: any) {
    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }
    const order: unknown[] = Array.isArray(body?.order) ? body.order : [];
    const subjects = await this.prisma.subject.findMany({
      where: {
        class_uuid: classUuid,
        class: { branch: { school_uuid: decoded.school_uuid } },
      },
      select: { uuid: true },
    });
    const known = new Set(subjects.map((s) => s.uuid));
    if (
      order.length !== known.size ||
      !order.every((uuid) => typeof uuid === 'string' && known.has(uuid))
    ) {
      throw new UnprocessableEntityException({
        status: 422,
        success: false,
        message: 'Send every subject of the class, in the new order',
      });
    }
    await this.prisma.$transaction(
      (order as string[]).map((uuid, position) =>
        this.prisma.subject.update({ where: { uuid }, data: { position } }),
      ),
    );
    await this.cache.del(this.cacheKey(classUuid));
    await this.notifyApps(classUuid);
    return this.index(classUuid);
  }

  async show(subjectUuid: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { uuid: subjectUuid },
    });
    return {
      status: 200,
      success: true,
      message: 'Subject deleted',
      data: { subject },
    };
  }

  async create(decoded: DecodedUser, classUuid: string, body: any) {
    const { name, description } = body;

    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!name) {
      throw new UnprocessableEntityException({
        status: 422,
        success: false,
        message: 'Name are required',
      });
    }

    const existingReg = await this.prisma.subject.findUnique({
      where: { class_uuid_name: { name, class_uuid: classUuid } },
    });

    if (existingReg) {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Subject name already taken for this class',
      });
    }

    const teacher_uuid = await this.teacherFrom(decoded, body.teacher_uuid);

    // New subjects go to the end of the class's order.
    const last = await this.prisma.subject.aggregate({
      where: { class_uuid: classUuid },
      _max: { position: true },
    });
    const subject = await this.prisma.subject.create({
      data: {
        name,
        description,
        class_uuid: classUuid,
        position: (last._max.position ?? -1) + 1,
        teacher_uuid: teacher_uuid ?? null,
      },
    });
    await this.cache.del(this.cacheKey(classUuid));
    await this.notifyApps(classUuid);

    return {
      status: 201,
      success: true,
      message: 'Subject created',
      data: { subject },
    };
  }

  async update(decoded: DecodedUser, subjectUuid: string, body: any) {
    const { name, class_uuid, description } = body;

    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!name || !class_uuid) {
      throw new UnprocessableEntityException({
        status: 422,
        success: false,
        message: 'Name and class are required',
      });
    }

    const existingSubject = await this.prisma.subject.findUnique({
      where: { class_uuid_name: { name, class_uuid } },
    });

    if (existingSubject && existingSubject.uuid !== subjectUuid) {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Subject name already taken for this class',
      });
    }

    const teacher_uuid = await this.teacherFrom(decoded, body.teacher_uuid);
    const before = await this.prisma.subject.findUnique({
      where: { uuid: subjectUuid },
      select: { class_uuid: true },
    });
    const subject = await this.prisma.subject.update({
      where: { uuid: subjectUuid },
      data: {
        name,
        class_uuid,
        description,
        ...(teacher_uuid !== undefined && { teacher_uuid }),
      },
    });
    await this.cache.del(this.cacheKey(class_uuid));
    await this.notifyApps(class_uuid);
    if (before && before.class_uuid !== class_uuid) {
      await this.cache.del(this.cacheKey(before.class_uuid));
      await this.notifyApps(before.class_uuid);
    }

    return {
      status: 200,
      success: true,
      message: 'Subject updated',
      data: { subject },
    };
  }

  async remove(decoded: DecodedUser, subjectUuid: string) {
    if (decoded.position !== 'ADMINISTRATIVE') {
      throw new BadRequestException({
        status: 400,
        success: false,
        message: 'Unauthorized',
      });
    }

    const subject = await this.prisma.subject.delete({
      where: { uuid: subjectUuid },
    });
    await this.cache.del(this.cacheKey(subject.class_uuid));
    await this.notifyApps(subject.class_uuid);

    return { status: 200, success: true, message: 'Subject deleted' };
  }
}
