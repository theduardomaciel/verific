"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { PopoverClose } from "@radix-ui/react-popover";

const FALLBACK_COLOR = "#f857a6"; // Cor padrão

interface ColorPickerProps {
	color?: string | null;
	defaultColor?: string | null;
	onChange?: (color: string | null) => void;
}

export function ColorPicker({
	color,
	defaultColor,
	onChange,
}: ColorPickerProps) {
	const [inputColor, setInputColor] = useState(
		color || defaultColor || FALLBACK_COLOR,
	);
	const [sliderPosition, setSliderPosition] = useState(50);
	const [pickerPosition, setPickerPosition] = useState({ x: 200, y: 60 }); // Posição padrão pra #f857a6
	const [hsl, setHsl] = useState({ h: 0, s: 0, l: 0 });

	// Acompanhar o estado de arraste
	// isDraggingPicker e isDraggingSlider são usados para acompanhar se o usuário está atualmente arrastando o seletor de cores ou o controle deslizante de brilho, respectivamente.
	const [isDraggingPicker, setIsDraggingPicker] = useState(false);
	const [isDraggingSlider, setIsDraggingSlider] = useState(false);

	const colorPickerRef = useRef<HTMLDivElement>(null);
	const sliderRef = useRef<HTMLDivElement>(null);

	// Inicializa a posição do seletor de cores com base na cor inicial (inputColor).
	useEffect(() => {
		if (colorPickerRef.current) {
			const initialHsl = hexToHsl(inputColor);
			setHsl(initialHsl);

			const rect = colorPickerRef.current.getBoundingClientRect();
			const x = (initialHsl.h / 360) * rect.width;
			const y = (1 - initialHsl.s) * rect.height;
			setPickerPosition({ x, y });

			// Set slider position based on lightness
			setSliderPosition(initialHsl.l * 100);
		}
	}, []);

	// Update color from picker position
	const updateColorFromPosition = (clientX: number, clientY: number) => {
		if (!colorPickerRef.current) return;

		const rect = colorPickerRef.current.getBoundingClientRect();
		const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
		const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

		setPickerPosition({ x, y });

		// Calculate HSL values
		const hue = (x / rect.width) * 360;
		const saturation = 1 - y / rect.height;
		const newHsl = { h: hue, s: saturation, l: hsl.l };
		setHsl(newHsl);

		// Convert HSL to hex
		const newColor = hslToHex(newHsl);
		setInputColor(newColor);
	};

	// Update slider position and brightness
	const updateSliderPosition = (clientX: number) => {
		if (!sliderRef.current) return;

		const rect = sliderRef.current.getBoundingClientRect();
		const position = Math.max(0, Math.min(clientX - rect.left, rect.width));
		const percentage = (position / rect.width) * 100;
		setSliderPosition(percentage);

		// Update lightness in HSL
		const lightness = percentage / 100;
		const newHsl = { ...hsl, l: lightness };
		setHsl(newHsl);

		// Convert updated HSL to hex
		const newColor = hslToHex(newHsl);
		setInputColor(newColor);
	};

	// Start dragging color picker
	const handleColorPickerMouseDown = (
		e: React.MouseEvent<HTMLDivElement>,
	) => {
		setIsDraggingPicker(true);
		updateColorFromPosition(e.clientX, e.clientY);
	};

	// Start dragging slider
	const handleSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		setIsDraggingSlider(true);
		updateSliderPosition(e.clientX);
	};

	// Handle mouse move for both picker and slider
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDraggingPicker) {
				updateColorFromPosition(e.clientX, e.clientY);
			} else if (isDraggingSlider) {
				updateSliderPosition(e.clientX);
			}
		};

		const handleMouseUp = () => {
			setIsDraggingPicker(false);
			setIsDraggingSlider(false);
		};

		// Add event listeners when dragging
		if (isDraggingPicker || isDraggingSlider) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}

		// Clean up
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDraggingPicker, isDraggingSlider, hsl]);

	// Handle touch events for mobile
	useEffect(() => {
		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches.length > 0) {
				const touch = e.touches[0]!;
				if (isDraggingPicker) {
					updateColorFromPosition(touch.clientX, touch.clientY);
				} else if (isDraggingSlider) {
					updateSliderPosition(touch.clientX);
				}
			}
		};

		const handleTouchEnd = () => {
			setIsDraggingPicker(false);
			setIsDraggingSlider(false);
		};

		if (isDraggingPicker || isDraggingSlider) {
			window.addEventListener("touchmove", handleTouchMove);
			window.addEventListener("touchend", handleTouchEnd);
		}

		return () => {
			window.removeEventListener("touchmove", handleTouchMove);
			window.removeEventListener("touchend", handleTouchEnd);
		};
	}, [isDraggingPicker, isDraggingSlider, hsl]);

	// Handle manual hex input
	const handleHexInput = (value: string) => {
		setInputColor(value);

		// Only update HSL if it's a valid hex color
		if (/^#[0-9A-F]{6}$/i.test(value)) {
			const newHsl = hexToHsl(value);
			setHsl(newHsl);

			// Update picker position
			if (colorPickerRef.current) {
				const rect = colorPickerRef.current.getBoundingClientRect();
				const x = (newHsl.h / 360) * rect.width;
				const y = (1 - newHsl.s) * rect.height;
				setPickerPosition({ x, y });
			}

			// Update slider position
			setSliderPosition(newHsl.l * 100);
		}
	};

	// Add or remove color
	const handleAddColor = () => {
		onChange?.(inputColor);
	};

	const handleRemoveColor = () => {
		if (defaultColor) {
			onChange?.(defaultColor);
		} else {
			onChange?.(null);
		}
		setInputColor(defaultColor ?? FALLBACK_COLOR); // Reset to default color
		setPickerPosition({ x: 200, y: 60 }); // Reset to default position
	};

	// Save color
	const handleSaveColor = () => {
		onChange?.(inputColor);
	};

	// Color conversion utilities
	function hexToHsl(hex: string): { h: number; s: number; l: number } {
		// Remove the # if present
		hex = hex.replace(/^#/, "");

		// Parse the hex values
		const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
		const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
		const b = Number.parseInt(hex.substring(4, 6), 16) / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0;
		let s = 0;
		const l = (max + min) / 2;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}

			h /= 6;
		}

		return { h: h * 360, s, l };
	}

	function hslToHex({
		h,
		s,
		l,
	}: {
		h: number;
		s: number;
		l: number;
	}): string {
		h /= 360;

		let r, g, b;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p: number, q: number, t: number) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;

			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		const toHex = (x: number) => {
			const hex = Math.round(x * 255).toString(16);
			return hex.length === 1 ? "0" + hex : hex;
		};

		return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	}

	// Create gradient background for slider based on current hue and saturation
	const getSliderBackground = () => {
		const { h, s } = hsl;
		const color1 = hslToHex({ h, s, l: 0 }); // Black
		const color2 = hslToHex({ h, s, l: 0.5 }); // Mid brightness
		const color3 = hslToHex({ h, s, l: 1 }); // White

		return `linear-gradient(to right, ${color1}, ${color2}, ${color3})`;
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				{!color && defaultColor ? (
					<Button onClick={handleAddColor}>
						<Plus className="h-5 w-5" />
						<span>Adicionar</span>
					</Button>
				) : (
					<Button variant={"outline"} className="hover:bg-muted px-2">
						<div
							className="h-4 w-4 rounded-sm"
							style={{ backgroundColor: color || inputColor }}
						/>
						<span className="text-muted-foreground">
							{color || inputColor}
						</span>
					</Button>
				)}
			</PopoverTrigger>
			<PopoverContent>
				{/* Color gradient */}
				<div
					ref={colorPickerRef}
					className="relative mb-4 h-[120px] w-full cursor-pointer rounded-md"
					style={{
						background:
							"linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
						backgroundImage:
							"linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%), linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
					}}
					onMouseDown={handleColorPickerMouseDown}
					onTouchStart={(e) => {
						setIsDraggingPicker(true);
						updateColorFromPosition(
							e.touches[0]!.clientX,
							e.touches[0]!.clientY,
						);
					}}
				>
					{/* Color picker circle */}
					<div
						className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-2 border-white bg-black"
						style={{
							left: `${pickerPosition.x}px`,
							top: `${pickerPosition.y}px`,
						}}
					/>
				</div>

				{/* Brightness slider */}
				<div
					ref={sliderRef}
					className="relative mb-4 h-6 w-full cursor-pointer rounded-full bg-[#262626]"
					style={{ background: getSliderBackground() }}
					onMouseDown={handleSliderMouseDown}
					onTouchStart={(e) => {
						setIsDraggingSlider(true);
						updateSliderPosition(e.touches[0]!.clientX);
					}}
				>
					<div
						className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-white"
						style={{ left: `${sliderPosition}%`, top: "50%" }}
					/>
				</div>

				{/* Hex input */}
				<Input
					className="mb-4 w-full"
					value={inputColor}
					onChange={(e) => setInputColor(e.target.value)}
				/>

				{/* Action buttons */}
				<PopoverClose asChild>
					<div className="flex w-full justify-between gap-2">
						{color ? (
							<Button
								variant="outline"
								className="flex-1"
								onClick={handleRemoveColor}
							>
								{defaultColor ? "Limpar" : "Remover"}
							</Button>
						) : (
							<Button variant="outline" className="flex-1">
								Cancelar
							</Button>
						)}
						<Button className="flex-1" onClick={handleSaveColor}>
							Confirmar
						</Button>
					</div>
				</PopoverClose>
			</PopoverContent>
		</Popover>
	);
}
