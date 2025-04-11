import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import GoogleLogo from "@/public/icons/google.svg";

export default function GoogleButton({ className }: { className?: string }) {
	return (
		<Button
			className={cn("w-full h-fit py-2.5", className)}
			variant={"outline"}
		>
			<GoogleLogo className="mr-2" />
			Continuar com Google
		</Button>
	);
}
