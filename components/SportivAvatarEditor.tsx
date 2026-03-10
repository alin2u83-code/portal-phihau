import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button, Modal } from './ui';
import { CameraIcon, UploadIcon, XIcon } from './icons';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { Sportiv } from '../types';

interface SportivAvatarEditorProps {
    sportiv: Sportiv;
    onUploadSuccess: (publicUrl: string) => void;
}

export const SportivAvatarEditor: React.FC<SportivAvatarEditorProps> = ({ sportiv, onUploadSuccess }) => {
    const { showError, showSuccess } = useError();
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImage(reader.result as string);
                setIsModalOpen(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Set canvas size to 500x500 as requested
        canvas.width = 500;
        canvas.height = 500;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            500,
            500
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.8);
        });
    };

    const handleUpload = async () => {
        if (!image || !croppedAreaPixels) return;

        setUploading(true);
        try {
            const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error("Nu s-a putut procesa imaginea.");

            const fileExt = 'jpg';
            const fileName = `${sportiv.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload în Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageBlob, { 
                    upsert: true,
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            // 2. Obține URL-ul public
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update în tabela sportivi
            const { error: updateError } = await supabase
                .from('sportivi')
                .update({ foto_url: publicUrl })
                .eq('id', sportiv.id);

            if (updateError) throw updateError;

            onUploadSuccess(publicUrl);
            showSuccess('Succes', 'Fotografia de profil a fost actualizată.');
            setIsModalOpen(false);
            setImage(null);
        } catch (error: any) {
            console.error('DETALII EROARE:', JSON.stringify(error, null, 2));
            showError('Eroare la încărcare', error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative group">
            <div className="relative h-24 w-24 mb-4 mx-auto md:mx-0">
                {sportiv.foto_url ? (
                    <img 
                        src={sportiv.foto_url} 
                        alt="Profil" 
                        referrerPolicy="no-referrer"
                        className="h-full w-full rounded-full object-cover border-2 border-violet-500 shadow-glow-blue" 
                    />
                ) : (
                    <div className="h-full w-full rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold text-white border-2 border-slate-600">
                        {sportiv.nume?.[0]}{sportiv.prenume?.[0]}
                    </div>
                )}
                
                <label className="absolute bottom-0 right-0 p-2 bg-violet-600 rounded-full cursor-pointer hover:bg-violet-500 transition-all shadow-lg transform hover:scale-110 active:scale-95 z-10">
                    <CameraIcon className="w-4 h-4 text-white" />
                    <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        disabled={uploading} 
                    />
                </label>
                
                {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[10px] text-white font-bold animate-pulse">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                        UPLOAD...
                    </div>
                )}
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => !uploading && setIsModalOpen(false)} 
                title="Decupează Fotografia"
            >
                <div className="space-y-4">
                    <div className="relative h-64 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                        {image && (
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Zoom</label>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsModalOpen(false)} 
                            disabled={uploading}
                        >
                            <XIcon className="w-4 h-4 mr-2" /> Anulează
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleUpload} 
                            isLoading={uploading}
                        >
                            <UploadIcon className="w-4 h-4 mr-2" /> Salvează Foto
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
