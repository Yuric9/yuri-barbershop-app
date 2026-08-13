export default function Brand({ onClick }: { onClick?: () => void }) {
  const logo = (
    <span className="brand-mark">
      <img src="/brand/yuri-barbershop-logo.png" alt="Logo oficial Yuri Barbershop" />
    </span>
  );

  if (onClick) {
    return (
      <button type="button" className="brand brand-home" onClick={onClick} aria-label="Voltar ao início">
        {logo}
      </button>
    );
  }

  return (
    <div className="brand">
      {logo}
    </div>
  );
}
