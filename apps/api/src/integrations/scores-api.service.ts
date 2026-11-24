import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ScoreComponent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScoreLimits, scoreLimits } from '../common/score-limits.js';
import { SCORES_SCOPE, OidcService, oauthError } from './oidc.service.js';

const MAX_SCORES = 500;
const COMPONENTS: Record<string, ScoreComponent> = {
  assessment: 'ASSESSMENT',
  examination: 'EXAMINATION',
};

type Tx = Prisma.TransactionClient;
type Target = {
  student_uuid: string;
  calendar_uuid: string;
  subject: string;
  component: ScoreComponent;
};
type Outcome = {
  student_uuid: string;
  status: 'saved' | 'skipped';
  message?: string;
  assessment?: number;
  examination?: number;
};

/** Thrown inside a transaction to roll it back and skip one student. */
class Skip extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

function text(value: unknown, field: string, max = 200, required = true) {
  if (value === undefined || value === null || value === '') {
    if (required) invalid(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string' || value.length > max) {
    invalid(`${field} must be text of at most ${max} characters`);
  }
  return value.trim();
}

function invalid(message: string): never {
  throw new UnprocessableEntityException({
    status: 422,
    success: false,
    message,
  });
}

/**
 * Lets connected apps record test, CA and exam scores on students' reports
 * (scope results.write). Each score is kept as an AppScore; a subject's
 * assessment or examination on the report is the sum of the app scores for
 * that term, subject and component. Approved reports are never changed.
 */
@Injectable()
export class ScoresApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oidc: OidcService,
  ) {}

  private async app(authorization: string | undefined) {
    const token = await this.oidc.resolveToken(authorization);
    if (!token.scope.split(' ').includes(SCORES_SCOPE)) {
      oauthError(
        'insufficient_scope',
        `This token needs the ${SCORES_SCOPE} scope`,
        403,
      );
    }
    return token.app;
  }

  /** POST /integrations/v1/scores: record (or update) one test's scores. */
  async record(authorization: string | undefined, body: any) {
    const app = await this.app(authorization);
    const sourceId = text(body?.source_id, 'source_id')!;
    const subject = text(body?.subject, 'subject')!;
    const title = text(body?.title, 'title', 200, false);
    const calendarUuid = text(body?.calendar_uuid, 'calendar_uuid', 64, false);
    const component = COMPONENTS[String(body?.component ?? '').toLowerCase()];
    if (!component) invalid('component must be assessment or examination');

    const scores = body?.scores;
    if (!Array.isArray(scores) || !scores.length) {
      invalid('scores must be a list of { student_uuid, score }');
    }
    if (scores.length > MAX_SCORES) {
      invalid(`Send at most ${MAX_SCORES} scores at a time`);
    }
    const seen = new Set<string>();
    const entries = scores.map((s: any, i: number) => {
      const student = s?.student_uuid;
      const score = Number(s?.score);
      if (typeof student !== 'string' || !student) {
        invalid(`scores[${i}].student_uuid is required`);
      }
      if (seen.has(student)) invalid(`${student} is in scores more than once`);
      seen.add(student);
      if (s?.score === null || s?.score === '' || !Number.isFinite(score)) {
        invalid(`scores[${i}].score must be a number`);
      }
      if (score < 0) invalid(`scores[${i}].score can't be negative`);
      return { student_uuid: student, score: round2(score) };
    });

    const limitsByBranch = new Map<string, ScoreLimits>();
    const results: Outcome[] = [];
    for (const entry of entries) {
      results.push(
        await this.recordOne(app, entry, {
          sourceId,
          subject,
          title,
          calendarUuid,
          component,
          limitsByBranch,
        }),
      );
    }
    const saved = results.filter((r) => r.status === 'saved').length;
    return {
      data: { saved, skipped: results.length - saved, results },
    };
  }

  private async recordOne(
    app: { uuid: string; school_uuid: string; disabled_branch_uuids: string[] },
    entry: { student_uuid: string; score: number },
    input: {
      sourceId: string;
      subject: string;
      title: string | null;
      calendarUuid: string | null;
      component: ScoreComponent;
      limitsByBranch: Map<string, ScoreLimits>;
    },
  ): Promise<Outcome> {
    const skip = (message: string): Outcome => ({
      student_uuid: entry.student_uuid,
      status: 'skipped',
      message,
    });

    const student = await this.prisma.student.findFirst({
      where: {
        uuid: entry.student_uuid,
        branch: { school_uuid: app.school_uuid },
      },
      select: {
        uuid: true,
        branch_uuid: true,
        class: {
          select: { uuid: true, name: true, subjects: { select: { name: true } } },
        },
      },
    });
    if (!student || app.disabled_branch_uuids.includes(student.branch_uuid)) {
      return skip('Student not found');
    }
    if (!student.class.subjects.some((s) => s.name === input.subject)) {
      return skip(
        `${input.subject} isn't a subject in ${student.class.name}`,
      );
    }

    const calendar = await this.prisma.calendar.findFirst({
      where: input.calendarUuid
        ? { uuid: input.calendarUuid, branch_uuid: student.branch_uuid }
        : { branch_uuid: student.branch_uuid, status: 'ACTIVE' },
      select: { uuid: true },
    });
    if (!calendar) {
      return skip(
        input.calendarUuid
          ? "That term isn't in this student's branch"
          : "The student's branch has no active term",
      );
    }

    let limits = input.limitsByBranch.get(student.branch_uuid);
    if (!limits) {
      limits = await scoreLimits(this.prisma, student.branch_uuid);
      input.limitsByBranch.set(student.branch_uuid, limits);
    }

    const target: Target = {
      student_uuid: student.uuid,
      calendar_uuid: calendar.uuid,
      subject: input.subject,
      component: input.component,
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const key = {
          app_uuid_source_id_student_uuid: {
            app_uuid: app.uuid,
            source_id: input.sourceId,
            student_uuid: student.uuid,
          },
        };
        const before = await tx.appScore.findUnique({ where: key });
        await tx.appScore.upsert({
          where: key,
          create: {
            app_uuid: app.uuid,
            source_id: input.sourceId,
            title: input.title,
            score: entry.score,
            ...target,
          },
          update: { title: input.title, score: entry.score, ...target },
        });
        const totals = await this.applyTotal(tx, target, limits!, student.class);
        // The same test moved to another subject, term or component: the old
        // place loses its score.
        if (
          before &&
          (before.calendar_uuid !== target.calendar_uuid ||
            before.subject !== target.subject ||
            before.component !== target.component)
        ) {
          await this.applyTotal(tx, before, limits!, null);
        }
        return { student_uuid: student.uuid, status: 'saved', ...totals };
      });
    } catch (error) {
      if (error instanceof Skip) return skip(error.message);
      throw error;
    }
  }

  /**
   * Writes the sum of the app scores for one subject's component onto the
   * student's report for that term, creating the report and its subject row
   * when needed (only when `cls` is given). Skips approved reports.
   */
  private async applyTotal(
    tx: Tx,
    target: Target,
    limits: ScoreLimits,
    cls: { uuid: string; name: string } | null,
  ) {
    const sum = await tx.appScore.aggregate({
      where: {
        student_uuid: target.student_uuid,
        calendar_uuid: target.calendar_uuid,
        subject: target.subject,
        component: target.component,
      },
      _sum: { score: true },
    });
    const total = round2(Number(sum._sum.score ?? 0));
    const field =
      target.component === 'ASSESSMENT' ? 'assessment' : 'examination';
    const max =
      target.component === 'ASSESSMENT'
        ? limits.assessment_max
        : limits.examination_max;
    if (total > max) {
      throw new Skip(
        `${target.subject} ${field} would be ${total}, more than the branch's limit of ${max}`,
      );
    }

    let result = await tx.result.findFirst({
      where: {
        student_uuid: target.student_uuid,
        calendar_uuid: target.calendar_uuid,
      },
      select: { uuid: true, status: true },
    });
    if (result?.status === 'APPROVED') {
      throw new Skip(
        'This report is already approved. An administrator must reopen it before scores can change.',
      );
    }
    if (!result) {
      if (!cls) return {};
      result = await tx.result.create({
        data: {
          student_uuid: target.student_uuid,
          calendar_uuid: target.calendar_uuid,
          class_uuid: cls.uuid,
          class_name: cls.name,
        },
        select: { uuid: true, status: true },
      });
    }

    const rowKey = {
      result_uuid_subject: { result_uuid: result.uuid, subject: target.subject },
    };
    let row = await tx.resultAssessments.findUnique({ where: rowKey });
    if (!row) {
      if (!cls) return {};
      row = await tx.resultAssessments.create({
        data: { result_uuid: result.uuid, subject: target.subject },
      });
    }
    const assessment = field === 'assessment' ? total : Number(row.assessment);
    const examination =
      field === 'examination' ? total : Number(row.examination);
    await tx.resultAssessments.update({
      where: rowKey,
      data: { assessment, examination, overall: round2(assessment + examination) },
    });
    // The report's total is the sum of all its subjects, as elsewhere.
    const overall = await tx.resultAssessments.aggregate({
      where: { result_uuid: result.uuid },
      _sum: { overall: true },
    });
    await tx.result.update({
      where: { uuid: result.uuid },
      data: { overall: Number(overall._sum.overall ?? 0) },
    });
    return { assessment, examination };
  }

  /** GET /integrations/v1/scores?source_id=…: what this app has recorded. */
  async list(authorization: string | undefined, query: Record<string, any>) {
    const app = await this.app(authorization);
    const sourceId = text(query.source_id, 'source_id')!;
    const data = await this.prisma.appScore.findMany({
      where: { app_uuid: app.uuid, source_id: sourceId },
      orderBy: { created_at: 'asc' },
      select: {
        student_uuid: true,
        calendar_uuid: true,
        subject: true,
        component: true,
        title: true,
        score: true,
        updated_at: true,
      },
    });
    return {
      data: data.map((s) => ({
        ...s,
        component: s.component.toLowerCase(),
        score: Number(s.score),
      })),
    };
  }

  /**
   * DELETE /integrations/v1/scores/:source_id: withdraws a test's scores (for
   * one student with ?student_uuid=). Reports that are already approved keep
   * them.
   */
  async remove(
    authorization: string | undefined,
    sourceId: string,
    query: Record<string, any>,
  ) {
    const app = await this.app(authorization);
    const studentUuid = text(query.student_uuid, 'student_uuid', 64, false);
    const rows = await this.prisma.appScore.findMany({
      where: {
        app_uuid: app.uuid,
        source_id: sourceId,
        ...(studentUuid && { student_uuid: studentUuid }),
      },
      include: { student: { select: { branch_uuid: true } } },
    });
    const results: Outcome[] = [];
    for (const row of rows) {
      const limits = await scoreLimits(this.prisma, row.student.branch_uuid);
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.appScore.delete({ where: { uuid: row.uuid } });
          await this.applyTotal(tx, row, limits, null);
        });
        results.push({ student_uuid: row.student_uuid, status: 'saved' });
      } catch (error) {
        if (!(error instanceof Skip)) throw error;
        results.push({
          student_uuid: row.student_uuid,
          status: 'skipped',
          message: error.message,
        });
      }
    }
    const removed = results.filter((r) => r.status === 'saved').length;
    return {
      data: { removed, skipped: results.length - removed, results },
    };
  }
}
