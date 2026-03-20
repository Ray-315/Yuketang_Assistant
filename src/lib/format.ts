export const percent = (value: number) => `${Math.round(value * 100)}%`;

export const decimal = (value: number) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value);

export const dateTime = (value?: string | null) => {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};
