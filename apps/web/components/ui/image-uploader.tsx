"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { processImageFile, type ImagePurpose } from "@/lib/images/optimization";
import { trpc } from "@/lib/trpc/react";

interface ImageUploaderProps {
	value?: string;
	onChange: (url: string, meta?: { width: number; height: number }) => void;
	purpose: ImagePurpose;
	projectId: string;
	label: string;
	hint?: string;
	aspect?: string;
	/** Como a imagem é exibida no produto (`cover` recorta, `contain` encaixa). */
	fit?: "cover" | "contain";
	/** Formato da prévia — `circle` espelha os avatares do produto. */
	shape?: "rect" | "circle";
}

type Status = "idle" | "processing" | "uploading" | "error";

/**
 * Seletor de arquivo com upload direto ao storage (presigned URL).
 * Substitui todos os inputs de URL de imagem. Sem campo de URL. A imagem
 * substituída só é apagada pelo servidor, quando o formulário é salvo.
 */
export function ImageUploader({
	value,
	onChange,
	purpose,
	projectId,
	label,
	hint,
	aspect = "aspect-video",
	fit = "cover",
	shape = "rect",
}: ImageUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [status, setStatus] = useState<Status>("idle");
	const [error, setError] = useState<string | null>(null);
	const requestUpload = trpc.requestImageUpload.useMutation();

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
			onChange(publicUrl, {
				width: processed.width,
				height: processed.height,
			});
			setStatus("idle");
		} catch (e) {
			setStatus("error");
			setError(e instanceof Error ? e.message : "Falha no envio.");
		}
	}

	function handleRemove() {
		onChange("");
		setError(null);
		setStatus("idle");
	}

	const busy = status === "processing" || status === "uploading";

	return (
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium">{label}</span>
			<div
				className={`relative w-full overflow-hidden border ${aspect} bg-muted ${
					shape === "circle" ? "rounded-full" : "rounded-xl"
				}`}
			>
				{value ? (
					<Image
						src={value}
						alt={label}
						fill
						className={
							fit === "contain"
								? "object-contain"
								: "object-cover"
						}
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
						onClick={handleRemove}
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
