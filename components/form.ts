import { startTransition, type FormEvent } from "react";

/**
 * `onSubmit` handler that dispatches a `useActionState` action without React
 * 19's automatic form reset. With `<form action={...}>`, React clears every
 * uncontrolled field after the action finishes, even when the server returns a
 * validation error, so the user would lose what they typed.
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}
