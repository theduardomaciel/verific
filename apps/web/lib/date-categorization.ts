export function categorizeByDate<T>(
    items: T[],
    getDate: (item: T) => Date
): { grouped: Map<string, T[]>; categories: string[] } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const grouped = new Map<string, T[]>();
    for (const item of items) {
        const activityDate = new Date(getDate(item));
        activityDate.setHours(0, 0, 0, 0);
        let category: string;
        if (activityDate.getTime() === today.getTime()) {
            category = "Hoje";
        } else if (activityDate.getTime() === tomorrow.getTime()) {
            category = "Amanhã";
        } else {
            category = activityDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
            });
        }
        if (!grouped.has(category)) {
            grouped.set(category, []);
        }
        grouped.get(category)!.push(item);
    }

    const categories = Array.from(grouped.keys()).sort((a, b) => {
        if (a === "Hoje") return -1;
        if (b === "Hoje") return 1;
        if (a === "Amanhã") return -1;
        if (b === "Amanhã") return 1;
        // Parse dates (DD/MM to Date)
        const dateA = new Date(a.split("/").reverse().join("-"));
        const dateB = new Date(b.split("/").reverse().join("-"));
        return dateA.getTime() - dateB.getTime();
    });

    return { grouped, categories };
}