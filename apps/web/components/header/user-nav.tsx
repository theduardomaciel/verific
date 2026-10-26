import Link from "next/link";

import { Cloud, LifeBuoy, LogOut, UserIcon } from "lucide-react";

import type { User } from "@verific/auth";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutForm } from "@/components/ui/logout-form";

import { getInitials } from "@/lib/i18n";

// Auth

interface Props {
	user: User;
	showAccountActions?: boolean;
}

export function UserNav({ user, showAccountActions }: Props) {
	const initials = getInitials(user.name);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-8 w-8 rounded-full"
				>
					<Avatar className="h-8 w-8">
						<AvatarImage src={user.image || ""} alt={user.id} />
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm leading-none font-medium">
							{user.name}
						</p>
						<p className="text-muted-foreground text-xs leading-none">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{showAccountActions && (
					<>
						<Link href="/account">
							<DropdownMenuItem>
								<UserIcon className="mr-2 h-4 w-4" />
								Minha Conta
							</DropdownMenuItem>
						</Link>
						<DropdownMenuGroup></DropdownMenuGroup>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<LifeBuoy className="mr-2 h-4 w-4" />
						Suporte
					</DropdownMenuItem>
					<DropdownMenuItem disabled>
						<Cloud className="mr-2 h-4 w-4" />
						API
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<LogoutForm>
					<DropdownMenuItem asChild>
						<button
							type="submit"
							className="flex w-full items-center justify-start"
						>
							<LogOut className="mr-2 h-4 w-4" />
							<span>Log out</span>
						</button>
					</DropdownMenuItem>
				</LogoutForm>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
