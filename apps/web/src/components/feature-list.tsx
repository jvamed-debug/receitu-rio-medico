export function FeatureList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <div
          key={item}
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: "#f7faf8",
            border: "1px solid #d9e8de"
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
