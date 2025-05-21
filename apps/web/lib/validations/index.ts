// Types
import type { GenericForm } from "@/components/forms";
import type { FieldError } from "react-hook-form";

export function isValid(key: string, section: number, form: GenericForm) {
	const dirtyFields = form.formState.dirtyFields;
	const errors = form.formState.errors;

	const currentSection = `section${section}`;

	/// NOTE: "Make sure to provide defaultValues at the useForm, so hook form can have a single source of truth to compare each field's dirtiness" - da documentação do react-hook-form
	return (
		(dirtyFields[currentSection]?.[key] ||
			form.getValues(`${currentSection}.${key}`)) &&
		!errors[currentSection]?.[key as keyof FieldError]
	);
}

/* 
form.formState.dirtyFields[`section${section}`]?.[key] &&
		!errors[`section${section}`]?.[key]
*/

export function scrollToNextSection(newSection: number) {
	document.getElementById(`section${newSection}`)?.scrollIntoView({
		behavior: "smooth",
	});
}
