"use client";

import { FormSection } from "@/components/forms";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { GenericForm } from "@/components/forms";

export interface ProfileFormValue {
	roleTitle?: string | null;
	birthDate?: string | null;
	city?: string | null;
	institution?: string | null;
	bio?: string | null;
	github?: string | null;
	instagram?: string | null;
	linkedin?: string | null;
	site?: string | null;
	publicEmail?: string | null;
	avatarSource?: "google" | "github" | null;
	avatarGithubHandle?: string | null;
}

function toProfileInput(value: ProfileFormValue) {
	const str = (v: string | null | undefined) => (v ?? "").trim();
	const socials: Array<{
		network: "github" | "instagram" | "linkedin" | "site";
		url: string;
	}> = [];
	const github = str(value.github).replace(/^@/, "");
	if (github) socials.push({ network: "github", url: `https://github.com/${github}` });
	for (const [network, raw] of [
		["instagram", value.instagram],
		["linkedin", value.linkedin],
		["site", value.site],
	] as const) {
		const url = str(raw);
		if (url) socials.push({ network, url });
	}
	const birth = str(value.birthDate);
	return {
		roleTitle: str(value.roleTitle) || null,
		birthDate: birth ? new Date(`${birth}T12:00:00`) : null,
		city: str(value.city) || null,
		institution: str(value.institution) || null,
		bio: str(value.bio) || null,
		socials,
		publicEmail: str(value.publicEmail) || null,
		avatarSource: value.avatarSource ?? "google",
		avatarGithubHandle: str(value.avatarGithubHandle) || str(value.github) || null,
	};
}

export { toProfileInput };

interface ProfileFieldsSectionProps {
	form: GenericForm;
}

/**
 * Seção fixa "Perfil" (sistema, não-removível): lida dentro do RHF do
 * formulário hospedeiro sob `profile.*`. Usada na inscrição e no diálogo
 * "Editar perfil" com as mesmas definições/validação.
 */
export function ProfileFieldsSection({ form }: ProfileFieldsSectionProps) {
	return (
		<FormSection
			title="Perfil no evento"
			section={0}
			form={form}
			fields={[{ name: "Perfil", value: true }]}
		>
			<div className="flex w-full flex-col gap-6">
				<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="profile.roleTitle"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Cargo / curso</FormLabel>
								<FormControl>
									<Input
										placeholder="Estudante de Psicologia"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="profile.birthDate"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Data de nascimento</FormLabel>
								<FormControl>
									<Input type="date" {...field} value={field.value ?? ""} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="profile.city"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Cidade</FormLabel>
								<FormControl>
									<Input
										placeholder="Maceió, AL"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="profile.institution"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Instituição</FormLabel>
								<FormControl>
									<Input
										placeholder="Universidade Federal de Alagoas"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="profile.bio"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>Bio</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Conte um pouco sobre você"
									{...field}
									value={field.value ?? ""}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="profile.github"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>GitHub (usuário)</FormLabel>
								<FormControl>
									<Input
										placeholder="seu-usuario"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="profile.instagram"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Instagram (URL)</FormLabel>
								<FormControl>
									<Input
										placeholder="https://instagram.com/voce"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="profile.linkedin"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>LinkedIn (URL)</FormLabel>
								<FormControl>
									<Input
										placeholder="https://linkedin.com/in/voce"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="profile.site"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Site (URL)</FormLabel>
								<FormControl>
									<Input
										placeholder="https://seusite.com"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="profile.publicEmail"
					render={({ field }) => (
						<FormItem className="w-full">
							<FormLabel>E-mail público (contato)</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="voce@exemplo.com"
									{...field}
									value={field.value ?? ""}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="profile.avatarSource"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Foto do perfil</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value ?? "google"}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Escolha a foto" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="google">
											Foto da conta Google
										</SelectItem>
										<SelectItem value="github">
											Foto do GitHub
										</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="profile.avatarGithubHandle"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>Usuário do GitHub (foto)</FormLabel>
								<FormControl>
									<Input
										placeholder="seu-usuario"
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>
		</FormSection>
	);
}
