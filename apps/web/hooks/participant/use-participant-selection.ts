"use client";

import { useState } from "react";

export function useParticipantSelection() {
    const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);

    const toggleSelection = (participant: any, checked: boolean) => {
        if (checked) {
            setSelectedParticipants((prev) => [...prev, participant]);
        } else {
            setSelectedParticipants((prev) =>
                prev.filter((p) => p.id !== participant.id),
            );
        }
    };

    const isSelected = (participantId: string) =>
        selectedParticipants.some((p) => p.id === participantId);

    const clearSelection = () => setSelectedParticipants([]);

    return {
        selectedParticipants,
        toggleSelection,
        isSelected,
        clearSelection,
    };
}