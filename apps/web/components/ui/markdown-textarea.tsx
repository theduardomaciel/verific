"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Bold,
	Italic,
	Strikethrough,
	Code,
	Code2,
	Link,
	List,
	ListOrdered,
	Quote,
	Heading1,
	Heading2,
	Heading3,
} from "lucide-react";

interface MarkdownTextareaProps
	extends Omit<React.ComponentProps<"textarea">, "onChange"> {
	value?: string;
	onChange?: (value: string) => void;
}

const MarkdownTextarea = React.forwardRef<
	HTMLTextAreaElement,
	MarkdownTextareaProps
>(({ className, value, onChange, ...props }, ref) => {
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	React.useImperativeHandle(ref, () => textareaRef.current!);

	const insertMarkdown = (before: string, after: string = "") => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selectedText = value?.substring(start, end) || "";
		const newText = before + selectedText + after;

		const newValue =
			value?.substring(0, start) + newText + value?.substring(end);
		onChange?.(newValue);

		// Set cursor position after the inserted text
		setTimeout(() => {
			textarea.focus();
			const newCursorPos =
				start + before.length + selectedText.length + after.length;
			textarea.setSelectionRange(newCursorPos, newCursorPos);
		}, 0);
	};

	const insertAtLineStart = (prefix: string) => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const text = value || "";
		const lines = text.split("\n");

		// Find which line the cursor is on
		let charCount = 0;
		let lineIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			charCount += lines[i]!.length + 1; // +1 for newline
			if (charCount > start) {
				lineIndex = i;
				break;
			}
		}

		// Insert prefix at the beginning of the line
		lines[lineIndex] = prefix + lines[lineIndex];
		const newText = lines.join("\n");
		onChange?.(newText);

		setTimeout(() => {
			textarea.focus();
			const newCursorPos = start + prefix.length;
			textarea.setSelectionRange(newCursorPos, newCursorPos);
		}, 0);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter") {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const text = value || "";

			const beforeCursor = text.substring(0, start);
			const afterCursor = text.substring(end);
			const linesBefore = beforeCursor.split("\n");
			const currentLine = linesBefore[linesBefore.length - 1] || "";
			const trimmed = currentLine.trim();

			let prefix = "";
			if (trimmed.startsWith("- ") && trimmed.length > 2) {
				prefix = "- ";
			} else if (/^\d+\.\s/.test(trimmed)) {
				const match = trimmed.match(/^(\d+)\.\s(.*)/);
				if (match && match[1] && match[2] && match[2].trim().length > 0) {
					const num = parseInt(match[1]) + 1;
					prefix = num + ". ";
				}
			}

			event.preventDefault();
			const newText = beforeCursor + "\n" + prefix + afterCursor;
			onChange?.(newText);

			setTimeout(() => {
				textarea.focus();
				const newPos = start + 1 + prefix.length;
				textarea.setSelectionRange(newPos, newPos);
			}, 0);
		}
	};

	const toolbarButtons = [
		{
			icon: Bold,
			label: "Negrito",
			action: () => insertMarkdown("**", "**"),
		},
		{
			icon: Italic,
			label: "Itálico",
			action: () => insertMarkdown("*", "*"),
		},
		{
			icon: Strikethrough,
			label: "Riscado",
			action: () => insertMarkdown("~~", "~~"),
		},
		{
			icon: Code,
			label: "Código inline",
			action: () => insertMarkdown("`", "`"),
		},
		{
			icon: Code2,
			label: "Bloco de código",
			action: () => insertMarkdown("```\n", "\n```"),
		},
		{
			icon: Link,
			label: "Link",
			action: () => insertMarkdown("[", "](url)"),
		},
		{
			icon: List,
			label: "Lista",
			action: () => insertAtLineStart("- "),
		},
		{
			icon: ListOrdered,
			label: "Lista ordenada",
			action: () => insertAtLineStart("1. "),
		},
		{
			icon: Quote,
			label: "Citação",
			action: () => insertAtLineStart("> "),
		},
		{
			icon: Heading1,
			label: "Cabeçalho 1",
			hideOnMobile: true,
			action: () => insertAtLineStart("# "),
		},
		{
			icon: Heading2,
			label: "Cabeçalho 2",
			hideOnMobile: true,
			action: () => insertAtLineStart("## "),
		},
		{
			icon: Heading3,
			label: "Cabeçalho 3",
			hideOnMobile: true,
			action: () => insertAtLineStart("### "),
		},
	];

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="bg-muted/50 flex flex-wrap gap-1 rounded-md border p-2">
				{toolbarButtons.map((button, index) => (
					<Button
						key={index}
						type="button"
						variant="ghost"
						size="sm"
						className={cn("h-8 w-8 p-0", {
							"hidden md:inline-flex": button.hideOnMobile,
						})}
						onClick={button.action}
						title={button.label}
					>
						<button.icon className="h-4 w-4" />
					</Button>
				))}
			</div>
			<Textarea
				ref={textareaRef}
				value={value}
				onChange={(e) => onChange?.(e.target.value)}
				onKeyDown={handleKeyDown}
				className="min-h-32"
				{...props}
			/>
		</div>
	);
});

MarkdownTextarea.displayName = "MarkdownTextarea";

export { MarkdownTextarea };
