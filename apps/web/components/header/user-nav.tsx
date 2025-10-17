import Link from "next/link";

// Icons
import { Cloud, LifeBuoy, LogOut, Settings } from "lucide-react";

// Components
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

// Actions
// import { signOutAction } from "@/app/actions";

// Types
import type { User } from "@verific/auth";

// Lib
import { getInitials } from "@/lib/i18n";

// Auth

interface Props {
	user: User;
	showAccountActions?: boolean;
}

export function UserNav({ user, showAccountActions }: Props) {
	const initials = getInitials(user.name);

	// console.log("UserNav user:", user);

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
						<Link href="/account/settings">
							<DropdownMenuItem>
								<Settings className="mr-2 h-4 w-4" />
								Configurações
								<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
							</DropdownMenuItem>
						</Link>
						<DropdownMenuGroup>
							{/* <Link href="/account">
								<DropdownMenuItem>
									<FolderCog className="mr-2 h-4 w-4" />
									Projetos
									<DropdownMenuShortcut>⇧⌘A</DropdownMenuShortcut>
								</DropdownMenuItem>
							</Link> */}
							{/* <DropdownMenuItem>
								<Plus className="mr-2 h-4 w-4" />
								Novo projeto
								<DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
							</DropdownMenuItem> */}
						</DropdownMenuGroup>
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
							className="flex w-full items-center justify-between"
						>
							<LogOut className="mr-2 h-4 w-4" />
							<span>Log out</span>
							<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
						</button>
					</DropdownMenuItem>
				</LogoutForm>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
