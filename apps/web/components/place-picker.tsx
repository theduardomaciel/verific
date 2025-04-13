"use client";

import { useState, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// Icons
import { MapPin, Search } from "lucide-react";

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

interface PlacePickerProps {
	defaultValue?: PlaceData;
	onPlaceChange?: (place: PlaceData) => void;
	className?: string;
}

export function PlacePicker({
	defaultValue,
	onPlaceChange,
	className,
}: PlacePickerProps) {
	const [open, setOpen] = useState(false);
	const [address, setAddress] = useState(defaultValue?.address || "");
	const [position, setPosition] = useState<[number, number]>(
		defaultValue
			? [defaultValue.latitude, defaultValue.longitude]
			: [51.505, -0.09],
	);
	const [searchInput, setSearchInput] = useState("");
	const mapRef = useRef<any>(null);
	const markerRef = useRef<any>(null);
	const prevPlaceRef = useRef<PlaceData | null>(null);

	// Inicializa o mapa quando o componente é montado
	useEffect(() => {
		if (!open) return;

		// Precisamos importar o Leaflet dinamicamente porque é uma biblioteca client-side
		const initializeMap = async () => {
			if (typeof window !== "undefined" && !mapRef.current) {
				// Importa o Leaflet dinamicamente
				const L = (await import("leaflet")).default;

				// Importa o CSS
				await import("leaflet/dist/leaflet.css");

				// Inicializa o mapa
				const map = L.map("map").setView(position, 13);

				L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
					attribution:
						'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				}).addTo(map);

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
		if (onPlaceChange && address && position[0] !== 0 && position[1] !== 0) {
			// Usa um ref para rastrear os valores anteriores e evitar atualizações desnecessárias
			const placeData = {
				address,
				latitude: position[0],
				longitude: position[1],
			};

			// Só chama onPlaceChange se os valores realmente mudaram
			if (JSON.stringify(placeData) !== JSON.stringify(prevPlaceRef.current)) {
				prevPlaceRef.current = placeData;
				onPlaceChange(placeData);
			}
		}
	}, [address, position, onPlaceChange]);

	// Geocodifica um endereço para obter as coordenadas
	const geocodeAddress = async () => {
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
			}
		} catch (error) {
			console.error("Geocoding error:", error);
		}
	};

	// Reverte a geocodificação das coordenadas para obter o endereço
	const reverseGeocode = async (lat: number, lon: number) => {
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
			);
			const data = await response.json();

			if (data?.display_name && data.display_name !== address) {
				setAddress(data.display_name);
			}
		} catch (error) {
			console.error("Reverse geocoding error:", error);
		}
	};

	return (
		<div className={cn("space-y-2 w-full", className)}>
			<Label htmlFor="location">Location</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
				<Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between max-w-full">
						{address ? (
							<div className="flex items-center gap-2 w-full overflow-hidden">
								<MapPin className="h-4 w-4 shrink-0 opacity-70" />
								<span className="truncate">{address}</span>
							</div>
						) : (
							<span>Selecione um local...</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[350px] p-0" align="start">
					<div className="p-4 space-y-4">
						<div className="flex gap-2">
							<Input
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
							<Button size="icon" onClick={geocodeAddress}>
								<Search className="h-4 w-4" />
							</Button>
						</div>
						<div id="map" className="h-[300px] w-full rounded-md border" />
						<div className="text-xs text-muted-foreground">
							Arraste o marcador ou clique no mapa para definir o local
						</div>
					</div>
				</PopoverContent>
			</Popover>
			{address && (
				<div className="text-sm text-muted-foreground mt-1">
					Coordenadas: {position[0].toFixed(6)}, {position[1].toFixed(6)}
				</div>
			)}
		</div>
	);
}
