"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";
import {
	processImageFile,
	type ImagePurpose,
} from "@/lib/images/optimization";

interface ImageUploaderProps {
	value?: string;
	onChange: (url: string, meta?: { width: number; height: number }) => void;
	purpose: ImagePurpose;
	projectId: string;
	label: string;
	hint?: string;
	aspect?: string;
}

type Status = "idle" | "processing" | "uploading" | "error";

/**
 * Seletor de arquivo com upload direto ao storage (presigned URL).
 * Substitui todos os inputs de URL de imagem. Sem campo de URL.
 */
export function ImageUploader({
	value,
	onChange,
	purpose,
	projectId,
	label,
	hint,
	aspect = "aspect-video",
}: ImageUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState<string | null>(null);
	const requestUpload = trpc.requestImageUpload.useMutation();
	const deleteImage = trpc.deleteImage.useMutation();

	async function handleFile(file: File | undefined) {
		if (!file) return;
		setError(null);
		try {
			setStatus("processing");
			const processed = await processImageFile(file, purpose);
			setStatus("uploading");
			const { uploadUrl, publicUrl } = await requestUpload.mutateAsync({
				purpose,
				projectId,
				contentType: processed.contentType,
				contentLength: processed.blob.size,
			});
			const res = await fetch(uploadUrl, {
				method: "PUT",
				body: processed.blob,
				headers: { "Content-Type": processed.contentType },
			});
			if (!res.ok) throw new Error("Falha no envio. Tente novamente.");
			const previous = value;
			onChange(publicUrl, {
				width: processed.width,
				height: processed.height,
			});
			if (previous && previous !== publicUrl) {
				try {
					await deleteImage.mutateAsync({
						projectId,
						publicUrlOrKey: previous,
					});
				} catch {
					// Best-effort: o objeto órfão pode ser coletado depois.
				}
			}
			setStatus("idle");
		} catch (e) {
			setStatus("error");
			setError(e instanceof Error ? e.message : "Falha no envio.");
		}
	}

	async function handleRemove() {
		if (value) {
			try {
				await deleteImage.mutateAsync({
					projectId,
					publicUrlOrKey: value,
				});
			} catch {
				// Best-effort: limpa o campo mesmo se a exclusão falhar.
			}
		}
		onChange("");
		setError(null);
		setStatus("idle");
	}

	const busy = status === "processing" || status === "uploading";

	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium">{label}</span>
			<div
				className={`relative w-full overflow-hidden rounded-xl border ${aspect} bg-muted`}
			>
				{value ? (
					<Image
						src={value}
						alt={label}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, 50vw"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center p-6 text-center">
						<span className="text-muted-foreground text-sm">
							{hint ?? "Nenhuma imagem enviada"}
						</span>
					</div>
				)}
				{busy && (
					<div className="bg-background/70 absolute inset-0 flex items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				)}
			</div>
			<input
				ref={inputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/svg+xml"
				className="hidden"
				onChange={(e) => void handleFile(e.target.files?.[0])}
			/>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={busy}
					onClick={() => inputRef.current?.click()}
				>
					<ImagePlus className="mr-2 h-4 w-4" />
					{status === "processing"
						? "Otimizando…"
						: status === "uploading"
							? "Enviando…"
							: value
								? "Trocar imagem"
								: "Enviar imagem"}
				</Button>
				{value && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={busy}
						onClick={() => void handleRemove()}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Remover
					</Button>
				)}
			</div>
			{error && <span className="text-destructive text-sm">{error}</span>}
		</div>
	);
}
