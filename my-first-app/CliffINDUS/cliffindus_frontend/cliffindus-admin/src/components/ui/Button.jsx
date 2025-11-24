export default function Button({
  children,
  onClick,
  className = "",
  variant = "primary",
  type = "button",
  disabled = false,
}) {
  const base =
    "px-4 py-2 rounded-lg font-medium text-sm transition focus:outline-none shadow-sm";

  const styles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed",
    danger:
      "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
