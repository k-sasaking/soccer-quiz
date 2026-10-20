export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="notice" role="alert">
      {message}
    </p>
  );
}
