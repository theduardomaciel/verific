"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EditMyAnswersForm } from "@/components/forms/dynamic/EditAnswersForm";
import {
	ProfileFieldsSection,
	toProfileInput,
	type ProfileFormValue,
} from "@/components/forms/profile-fields-section";
import type { GenericForm } from "@/components/forms";
import { trpc } from "@/lib/trpc/react";
import { revalidateProfile } from "@/lib/profile-actions";
import {
	profileInputSchema,
	type PrivacyValue,
} from "@verific/drizzle/profile";
import type { RouterOutput } from "@verific/api";

export type MyProfileData = NonNullable<RouterOutput["getMyProfile"]>;

const PRIVACY_ROWS: Array<{
	key: "birthDate" | "email" | "github" | "instagram" | "city" | "institution";
	label: string;
	hint: string;
}> = [
	{ key: "birthDate", label: "Data de nascimento", hint: "Privado por padrão" },
	{ key: "email", label: "E-mail público", hint: "Privado por padrão" },
	{ key: "github", label: "GitHub", hint: "" },
	{ key: "instagram", label: "Instagram", hint: "" },
	{ key: "city", label: "Cidade", hint: "" },
	{ key: "institution", label: "Instituição", hint: "" },
];

function toDateInput(d: Date | string | null | undefined): string {
	if (!d) return "";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
}

function socialUrl(
	socials: Array<{ network: string; url: string }>,
	network: string,
): string {
	return socials.find((s) => s.network === network)?.url ?? "";
}

function githubHandle(url: string): string {
	const m = url.match(/github\.com\/([^/?#]+)/i);
	return m?.[1] ?? "";
}

interface EditProfileDialogProps {
	eventUrl: string;
	projectId: string;
	shortId: string;
	initial: MyProfileData;
}

export function EditProfileDialog({
	eventUrl,
	projectId,
	shortId,
	initial,
}: EditProfileDialogProps) {
	const router = useRouter();
	const utils = trpc.useUtils();
	const updateMutation = trpc.updateProfile.useMutation();

	const form = useForm<{
		profile: ProfileFormValue & { privacy: Record<string, PrivacyValue> };
	}>({
		defaultValues: {
			profile: {
				roleTitle: initial.profile?.roleTitle ?? "",
				birthDate: toDateInput(initial.profile?.birthDate),
				city: initial.profile?.city ?? "",
				institution: initial.profile?.institution ?? "",
				bio: initial.profile?.bio ?? "",
				github:
					initial.profile?.avatarGithubHandle ??
					githubHandle(socialUrl(initial.profile?.socials ?? [], "github")),
				instagram: socialUrl(initial.profile?.socials ?? [], "instagram"),
				linkedin: socialUrl(initial.profile?.socials ?? [], "linkedin"),
				site: socialUrl(initial.profile?.socials ?? [], "site"),
				publicEmail: initial.profile?.publicEmail ?? "",
				avatarSource:
					(initial.profile?.avatarSource as "google" | "github") ?? "google",
				avatarGithubHandle: initial.profile?.avatarGithubHandle ?? "",
				privacy: { ...(initial.profile?.privacy ?? {}) } as Record<
					string,
					PrivacyValue
				>,
			},
		},
	});

	async function onSubmit(values: {
		profile: ProfileFormValue & { privacy: Record<string, PrivacyValue> };
	}) {
		try {
			const { privacy, ...rest } = values.profile;
			const parsed = profileInputSchema.parse({
				...toProfileInput(rest),
				privacy,
			});
			await updateMutation.mutateAsync({
				projectUrl: eventUrl,
				profile: parsed,
			});
			await revalidateProfile(eventUrl, shortId);
			utils.getMyProfile.invalidate();
			router.refresh();
			toast.success("Perfil atualizado!");
		} catch {
			toast.error("Erro ao salvar perfil. Verifique os campos.");
		}
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					size="lg"
					className="ev-button rounded-full"
				>
					<SettingsIcon />
					Editar perfil
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
				<DialogHeader>
					<DialogTitle>Editar perfil</DialogTitle>
				</DialogHeader>
				<Tabs defaultValue="perfil">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="perfil">Perfil</TabsTrigger>
						<TabsTrigger value="privacidade">Privacidade</TabsTrigger>
						<TabsTrigger value="inscricao">Inscrição</TabsTrigger>
					</TabsList>
					<TabsContent value="perfil">
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex flex-col gap-4"
						>
							<ProfileFieldsSection
								form={form as unknown as GenericForm}
							/>
							<Button
								type="submit"
								className="ev-button"
								disabled={updateMutation.isPending}
							>
								{updateMutation.isPending ? "Salvando…" : "Salvar perfil"}
							</Button>
						</form>
					</TabsContent>
					<TabsContent value="privacidade">
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex flex-col gap-4"
						>
							<p className="text-muted-foreground text-sm">
								Escolha o que aparece na sua página pública. E-mail e
								data de nascimento são privados por padrão.
							</p>
							{PRIVACY_ROWS.map((row) => {
								const privacy = form.watch("profile.privacy") ?? {};
								return (
									<div
										key={row.key}
										className="flex items-center justify-between gap-4 rounded-lg border p-3"
									>
										<div className="flex flex-col">
											<Label>{row.label}</Label>
											{row.hint && (
												<span className="text-muted-foreground text-xs">
													{row.hint}
												</span>
											)}
										</div>
										<Switch
											checked={privacy[row.key] === "public"}
											onCheckedChange={(checked) =>
												form.setValue("profile.privacy", {
													...privacy,
													[row.key]: checked
														? "public"
														: "private",
												})
											}
										/>
									</div>
								);
							})}
							<Button
								type="submit"
								className="ev-button"
								disabled={updateMutation.isPending}
							>
								{updateMutation.isPending
									? "Salvando…"
									: "Salvar privacidade"}
							</Button>
						</form>
					</TabsContent>
					<TabsContent value="inscricao">
						<EditMyAnswersForm projectId={projectId} />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
