import { signOutFormAction } from "@/app/actions";

interface LogoutFormProps {
	children: React.ReactNode;
	className?: string;
	redirectTo?: string;
}

export function LogoutForm({
	children,
	className,
	redirectTo = "/",
}: LogoutFormProps) {
	return (
		<form action={signOutFormAction} className={className}>
			<input type="hidden" name="redirectTo" value={redirectTo} />
			{children}
		</form>
	);
}
