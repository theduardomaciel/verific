import { Skeleton } from "../../../../components/ui/skeleton";

export default function AccountLoading() {
	return (
		<div className="container-p mb-8 flex w-full flex-col gap-4 md:gap-12">
			<Skeleton className="h-10 w-48" />
			{[1, 2, 3].map((i) => (
				<div key={i} className="flex flex-col gap-4">
					<Skeleton className="h-8 w-32" />
					<div className="flex flex-col gap-4">
						{[1, 2].map((j) => (
							<Skeleton
								key={j}
								className="h-24 w-full rounded-lg"
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
