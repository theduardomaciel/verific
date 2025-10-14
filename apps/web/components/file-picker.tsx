"use client";
import React, { useRef, useState, useEffect } from "react";

interface FilePickerProps {
	accept?: string;
	multiple?: boolean;
	onFilesChange?: (files: File[] | null) => void;
	initialPreviewUrl?: string | null;
}

export function FilePicker({
	accept = "image/*",
	multiple = false,
	onFilesChange,
	initialPreviewUrl = null,
}: FilePickerProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [files, setFiles] = useState<File[] | null>(null);
	const [preview, setPreview] = useState<string | null>(initialPreviewUrl);

	useEffect(() => {
		if (!files || files.length === 0) {
			setPreview(initialPreviewUrl);
			return;
		}

		const f = files[0];
		if (!f) {
			setPreview(initialPreviewUrl);
			return;
		}

		const url = URL.createObjectURL(f as Blob);
		setPreview(url);

		return () => {
			URL.revokeObjectURL(url);
			setPreview(initialPreviewUrl);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [files]);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const sel = e.target.files;
		if (!sel || sel.length === 0) {
			setFiles(null);
			onFilesChange?.(null);
			return;
		}

		const arr = Array.from(sel);
		setFiles(arr);
		onFilesChange?.(arr);
	}

	return (
		<div>
			<div className="flex items-center gap-2">
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					multiple={multiple}
					onChange={handleChange}
					className="hidden"
					id="file-picker-input"
				/>
				<label
					htmlFor="file-picker-input"
					className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1 text-sm"
				>
					Selecionar arquivo
				</label>
				{files && files.length > 0 && (
					<span className="text-muted-foreground text-sm">
						{files.length} arquivo(s) selecionado(s)
					</span>
				)}
			</div>

			{preview && (
				<div className="mt-3">
					<img
						src={preview}
						alt="preview"
						className="max-h-40 rounded"
					/>
				</div>
			)}
		</div>
	);
}

export default FilePicker;
