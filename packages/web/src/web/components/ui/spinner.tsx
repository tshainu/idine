export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-transparent"
      style={{
        width: size,
        height: size,
        borderTopColor: "var(--color-gold)",
        borderRightColor: "var(--color-gold)",
      }}
    />
  );
}
