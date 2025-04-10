import { MemberCard, MemberCardModal } from "@/components/members/MemberCard";

export default async function MemberModal(
    props: {
        params: Promise<{ memberId: string }>;
    }
) {
    const params = await props.params;

    const {
        memberId
    } = params;

    return (
		<MemberCardModal>
			<MemberCard id={memberId} />
		</MemberCardModal>
	);
}
