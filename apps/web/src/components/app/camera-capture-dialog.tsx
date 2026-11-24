'use client';

import {useEffect, useRef, useState} from 'react';
import {Camera, RefreshCw, RotateCcw, Video} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

interface CameraCaptureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCapture: (file: File) => void;
    /** Called when the browser can't open a live camera, so the caller can fall back to a native capture input. */
    onUnavailable?: () => void;
}

interface CameraDevice {
    deviceId: string;
    label: string;
}

// Remembered separately from the attendance camera, so each can be its own.
const CAMERA_STORAGE_KEY = 'penlumen:photo-camera';

function savedCamera() {
    try {
        return localStorage.getItem(CAMERA_STORAGE_KEY);
    } catch {
        return null;
    }
}

function saveCamera(deviceId: string) {
    try {
        localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
    } catch {
        // Private browsing: just don't remember it.
    }
}

/**
 * Takes a profile photo (students and staff) with the camera of your choice,
 * laid out like the attendance camera (FacialRecognitionModal).
 */
export function CameraCaptureDialog({open, onOpenChange, onCapture, onUnavailable}: CameraCaptureDialogProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [ready, setReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [switchingCamera, setSwitchingCamera] = useState(false);
    // Front cameras show mirrored, like a mirror; the saved photo isn't.
    const [mirrored, setMirrored] = useState(true);
    const [captured, setCaptured] = useState<{ file: File; preview: string } | null>(null);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    };

    const clearCaptured = () => {
        setCaptured((prev) => {
            if (prev) URL.revokeObjectURL(prev.preview);
            return null;
        });
    };

    const refreshCameras = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
            .filter((device) => device.kind === 'videoinput')
            .map((device, index) => ({
                deviceId: device.deviceId,
                label: device.label || `Camera ${index + 1}`,
            }));
        setCameras(videoDevices);
        return videoDevices;
    };

    const startCamera = async (deviceId?: string) => {
        stopCamera();
        setReady(false);
        setCameraError(null);
        try {
            const size = {width: {ideal: 1280}, height: {ideal: 1280}};
            const constraints: MediaStreamConstraints = deviceId
                ? {video: {deviceId: {exact: deviceId}, ...size}}
                : {video: {facingMode: 'user', ...size}};
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            const settings = stream.getVideoTracks()[0]?.getSettings();
            const activeDeviceId = settings?.deviceId || deviceId || '';
            if (activeDeviceId) {
                setSelectedCameraId(activeDeviceId);
                saveCamera(activeDeviceId);
            }
            setMirrored(settings?.facingMode !== 'environment');
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            // Labels only show once the camera is allowed.
            await refreshCameras();
            setReady(true);
        } catch (error: any) {
            setCameraError(error.message || 'Could not access the selected camera');
            setReady(false);
        }
    };

    useEffect(() => {
        if (!open) {
            stopCamera();
            clearCaptured();
            setReady(false);
            setCameraError(null);
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            onOpenChange(false);
            onUnavailable?.();
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const devices = await refreshCameras();
                if (cancelled) return;
                const saved = savedCamera();
                const selected = saved && devices.some((camera) => camera.deviceId === saved)
                    ? saved
                    : undefined;
                if (selected) setSelectedCameraId(selected);
                await startCamera(selected);
            } catch (error: any) {
                if (!cancelled) setCameraError(error.message || 'Could not access the camera');
            }
        })();

        return () => {
            cancelled = true;
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleCameraChange = async (deviceId: string) => {
        setSelectedCameraId(deviceId);
        saveCamera(deviceId);
        clearCaptured();
        setSwitchingCamera(true);
        try {
            await startCamera(deviceId);
        } finally {
            setSwitchingCamera(false);
        }
    };

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) return;

        // The preview is mirrored; un-mirror so the saved photo isn't flipped.
        if (mirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `photo-${Date.now()}.jpg`, {type: 'image/jpeg'});
            setCaptured({file, preview: URL.createObjectURL(blob)});
            stopCamera();
        }, 'image/jpeg', 0.9);
    };

    const handleRetake = () => {
        clearCaptured();
        void startCamera(selectedCameraId || undefined);
    };

    const handleUsePhoto = () => {
        if (!captured) return;
        onCapture(captured.file);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>Take photo</DialogTitle>
                </DialogHeader>
                <p className='text-sm text-muted-foreground -mt-2'>
                    Position the face in the frame, then capture
                </p>

                <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                        <Video className='h-4 w-4 text-muted-foreground'/>
                        <span className='text-sm font-medium'>Camera</span>
                    </div>
                    <Select
                        value={selectedCameraId}
                        onValueChange={handleCameraChange}
                        disabled={!cameras.length || switchingCamera || !!captured}
                    >
                        <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select a camera'/>
                        </SelectTrigger>
                        <SelectContent>
                            {cameras.map((camera) => (
                                <SelectItem key={camera.deviceId} value={camera.deviceId}>{camera.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground'>Your selected camera is remembered for the next photo on this browser.</p>
                </div>

                <div className='relative w-full aspect-square rounded-lg overflow-hidden bg-muted'>
                    {/* Always on the page, so "Try again" has somewhere to show the camera. */}
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''} ${captured || cameraError ? 'hidden' : ''}`}
                    />
                    {cameraError && !captured && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center'>
                            <Camera className='h-8 w-8 text-muted-foreground'/>
                            <p className='text-sm text-muted-foreground'>{cameraError}</p>
                        </div>
                    )}
                    {captured && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={captured.preview} alt='Captured' className='absolute inset-0 h-full w-full object-cover'/>
                    )}
                    {!captured && !ready && !cameraError && (
                        <div className='absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm'>
                            {switchingCamera ? 'Switching camera...' : 'Loading camera...'}
                        </div>
                    )}
                </div>

                {cameraError && !captured ? (
                    <Button variant='outline' onClick={() => startCamera(selectedCameraId || undefined)} className='w-full'>
                        <RefreshCw className='h-4 w-4'/>
                        Try again
                    </Button>
                ) : captured ? (
                    <div className='grid grid-cols-2 gap-2'>
                        <Button variant='outline' onClick={handleRetake}>
                            <RotateCcw className='h-4 w-4'/>
                            Retake
                        </Button>
                        <Button onClick={handleUsePhoto}>Use photo</Button>
                    </div>
                ) : (
                    <Button onClick={handleCapture} disabled={!ready} className='w-full'>
                        <Camera className='h-4 w-4'/>
                        Capture
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    );
}
