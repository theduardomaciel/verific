"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// Icons
import { Loader2, MapPin, Search } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface PlaceData {
	address: string;
	latitude: number;
	longitude: number;
}

interface PlacePickerProps
	extends Omit<React.ComponentProps<"button">, "defaultValue" | "value"> {
	defaultValue?: PlaceData;
	value?: PlaceData;
	onPlaceChange?: (place: PlaceData) => void;
	onBlur?: () => void;
}

export function PlacePicker({
	defaultValue,
	value,
	onPlaceChange,
	onBlur,
	className,
	...rest
}: PlacePickerProps) {
	const [open, setOpen] = useState(false);
	const [address, setAddress] = useState(
		value?.address ?? defaultValue?.address ?? "",
	);
	const [position, setPosition] = useState<[number, number]>(
		value
			? [value.latitude, value.longitude]
			: defaultValue
				? [defaultValue.latitude, defaultValue.longitude]
				: [-9.669408, -35.721292],
	);
	const [searchInput, setSearchInput] = useState("");
	const [status, setStatus] = useState<{
		message?: string;
		type: "error" | "loading" | null;
	}>({ type: null });

	const mapRef = useRef<any>(null);
	const markerRef = useRef<any>(null);
	const prevPlaceRef = useRef<PlaceData | null>(null);

	// Inicializa o mapa quando o componente é montado
	useEffect(() => {
		if (!open) return;

		// Precisamos importar o Leaflet dinamicamente porque é uma biblioteca client-side
		const initializeMap = async () => {
			if (typeof window !== "undefined") {
				// Importa o Leaflet dinamicamente
				const L = (await import("leaflet")).default;

				// Importa o CSS
				await import("leaflet/dist/leaflet.css");

				// If map already exists, remove it first
				if (mapRef.current) {
					mapRef.current.remove();
					mapRef.current = null;
					markerRef.current = null;
				}

				// Fix Leaflet's default icon issue
				// This is needed because Leaflet's assets are not properly resolved when dynamically imported
				L.Icon.Default.mergeOptions({
					iconRetinaUrl:
						"https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
					iconUrl:
						"https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
					shadowUrl:
						"https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
				});

				// Inicializa o mapa
				console.log("Initializing map with position:", position);
				const map = L.map("map").setView(position, 13);

				L.tileLayer(
					"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
					{
						attribution:
							'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					},
				).addTo(map);

				// Adiciona um marcador
				const marker = L.marker(position, {
					draggable: true,
				}).addTo(map);

				// Atualiza a posição quando o marcador é arrastado
				marker.on("dragend", () => {
					const newPos = marker.getLatLng();
					setPosition([newPos.lat, newPos.lng]);
					reverseGeocode(newPos.lat, newPos.lng);
				});

				// Atualiza o marcador quando o mapa é clicado
				map.on("click", (e: any) => {
					marker.setLatLng(e.latlng);
					setPosition([e.latlng.lat, e.latlng.lng]);
					reverseGeocode(e.latlng.lat, e.latlng.lng);
				});

				mapRef.current = map;
				markerRef.current = marker;
			}
		};

		initializeMap();

		return () => {
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
		};
	}, [open, position]);

	// Atualiza o mapa quando a posição muda
	useEffect(() => {
		if (mapRef.current && markerRef.current) {
			mapRef.current.setView(position);
			markerRef.current.setLatLng(position);
		}
	}, [position]);

	// Notifica o componente pai quando o local muda
	useEffect(() => {
		if (
			onPlaceChange &&
			address &&
			position[0] !== 0 &&
			position[1] !== 0
		) {
			// Usa um ref para rastrear os valores anteriores e evitar atualizações desnecessárias
			const placeData = {
				address,
				latitude: position[0],
				longitude: position[1],
			};

			// Só chama onPlaceChange se os valores realmente mudaram
			if (
				JSON.stringify(placeData) !==
				JSON.stringify(prevPlaceRef.current)
			) {
				prevPlaceRef.current = placeData;
				onPlaceChange(placeData);
			}
		}
	}, [address, position, onPlaceChange]);

	// Sincroniza o estado interno com a prop value
	useEffect(() => {
		if (value) {
			setAddress(value.address);
			setPosition([value.latitude, value.longitude]);
		}
	}, [value]);

	// Geocodifica um endereço para obter as coordenadas
	const geocodeAddress = async () => {
		if (!searchInput.trim()) return;
		setStatus({ type: "loading" });

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}`,
			);
			const data = await response.json();

			if (data && data.length > 0) {
				const { lat, lon, display_name } = data[0];
				setPosition([Number.parseFloat(lat), Number.parseFloat(lon)]);
				setAddress(display_name);
				setSearchInput("");
				setStatus({ type: null });
			} else {
				// No results found
				console.log("No locations found for this search term");
				setStatus({
					message: "Nenhum local encontrado para a pesquisa.",
					type: "error",
				});
			}
		} catch (error) {
			console.error("Geocoding error:", error);
			setStatus({
				message: "Erro ao buscar o local.",
				type: "error",
			});
		}
	};

	// Reverte a geocodificação das coordenadas para obter o endereço
	const reverseGeocode = async (lat: number, lon: number) => {
		if (!lat || !lon) return;

		setStatus({ type: "loading" });

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
			);
			const data = await response.json();

			if (data?.display_name && data.display_name !== address) {
				setAddress(data.display_name);
			}

			setStatus({ type: null });
		} catch (error) {
			console.error("Reverse geocoding error:", error);
			setStatus({
				message: "Erro ao buscar o local.",
				type: "error",
			});
		}
	};

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen && onBlur) {
					onBlur();
				}
			}}
		>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					disabled={status.type === "loading"}
					aria-expanded={open}
					className="w-full max-w-full justify-between"
					{...rest}
				>
					{status.type === "error" ? (
						<span className="text-red-500">{status.message}</span>
					) : address ? (
						<div className="grid w-full">
							<div className="flex w-full items-center gap-2 overflow-hidden">
								<MapPin className="h-4 w-4 shrink-0 opacity-70" />
								<span className="truncate">{address}</span>
							</div>
						</div>
					) : (
						<span className="text-muted-foreground">
							Selecione um local...
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<div className="space-y-4 p-4">
					<div className="flex gap-2">
						<Input
							className={cn("w-full", {
								"animate-pulse": status.type === "loading",
								"!border-destructive !ring-destructive/50":
									status.type === "error",
							})}
							placeholder="Pesquisar endereço..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									geocodeAddress();
								}
							}}
						/>
						<Button
							size="icon"
							onClick={geocodeAddress}
							// TODO: Não podemos colocar a verificação de status == loading,
							// visto que causa algum tipo de efeito colateral que fecha o popover
							disabled={!searchInput}
							className={cn({
								"pointer-events-none cursor-default opacity-50 select-none":
									!searchInput || status.type === "loading",
							})}
						>
							{status.type === "loading" ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Search className="h-4 w-4" />
							)}
						</Button>
					</div>
					<div
						id="map"
						className="h-[300px] w-full rounded-md border"
					/>
					{/* <div className="text-xs text-muted-foreground">
							Arraste o marcador ou clique no mapa para definir o local
						</div> */}
				</div>
			</PopoverContent>
		</Popover>
	);
}
