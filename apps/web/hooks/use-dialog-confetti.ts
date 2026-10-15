"use client";

import { useEffect } from "react";

import confetti from "canvas-confetti";

interface UseDialogConfettiOptions {
	/** Initial explosion particle count */
	explosionCount?: number;
	/** Rain particle count per frame */
	rainCount?: number;
	/** Rain gravity (lower = slower fall) */
	rainGravity?: number;
	/** Z-index for confetti canvas */
	zIndex?: number;
}

/**
 * Hook to trigger confetti effects when a dialog opens.
 * - Fires an initial explosion burst
 * - Maintains continuous rain while open
 * - Cleans up on close
 * - Respects prefers-reduced-motion
 */
export function useDialogConfetti(
	open: boolean,
	options: UseDialogConfettiOptions = {},
) {
	const {
		explosionCount = 150,
		rainCount = 1,
		rainGravity = 0.7,
		zIndex = 9999,
	} = options;

	useEffect(() => {
		if (!open) return;

		const baseOptions = {
			disableForReducedMotion: true,
			zIndex,
		};

		// Initial explosion burst
		void confetti({
			...baseOptions,
			particleCount: explosionCount,
			spread: 80,
			startVelocity: 45,
			origin: { x: 0.5, y: 0.6 },
		});

		// Continuous rain while dialog is open
		let raf = 0;
		const rain = () => {
			void confetti({
				...baseOptions,
				particleCount: rainCount,
				angle: 270,
				spread: 70,
				startVelocity: 12,
				gravity: rainGravity,
				ticks: 400,
				origin: { x: Math.random(), y: -0.1 },
			});
			raf = requestAnimationFrame(rain);
		};
		raf = requestAnimationFrame(rain);

		return () => {
			cancelAnimationFrame(raf);
			confetti.reset();
		};
	}, [open, explosionCount, rainCount, rainGravity, zIndex]);
}
