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
import { Cloud, FolderCog, LifeBuoy, LogOut, Settings } from "lucide-react";
import Link from "next/link";

interface Props {
	showAccountActions?: boolean;
}

export default function UserNav({ showAccountActions }: Props) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage src="/avatars/01.png" alt="@shadcn" />
						<AvatarFallback>LA</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">LACOMP</p>
						<p className="text-xs leading-none text-muted-foreground">
							lacomp@ic.ufal.br
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
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					Log out
					<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
