export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white shadow-sm rounded-xl border border-gray-200 p-5 ${className}`}
    >
      {children}
    </div>
  );
}
