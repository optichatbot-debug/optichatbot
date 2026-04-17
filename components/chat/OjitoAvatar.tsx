'use client'

interface OjitoAvatarProps {
  size?: number
  animated?: boolean
  className?: string
}

export function OjitoAvatar({ size = 40, animated = false, className = '' }: OjitoAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? 'animate-bounce-slow' : ''} ${className}`}
    >
      {/* Cuerpo del robot */}
      <rect x="15" y="30" width="50" height="38" rx="12" fill="#2563EB" />

      {/* Cabeza */}
      <rect x="18" y="8" width="44" height="32" rx="14" fill="#1D4ED8" />

      {/* Antena */}
      <line x1="40" y1="8" x2="40" y2="2" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="2" r="2.5" fill="#38BDF8" />

      {/* Lentes - Marco izquierdo */}
      <rect x="19" y="16" width="17" height="13" rx="4" fill="#0F172A" />
      <rect x="20.5" y="17.5" width="14" height="10" rx="3" fill="#38BDF8" fillOpacity="0.3" />
      {/* Pupila izquierda */}
      <circle cx="27.5" cy="22.5" r="3.5" fill="#0F172A" />
      <circle cx="27.5" cy="22.5" r="2" fill="white" />
      <circle cx="28.5" cy="21.5" r="0.8" fill="#0F172A" />

      {/* Lentes - Marco derecho */}
      <rect x="44" y="16" width="17" height="13" rx="4" fill="#0F172A" />
      <rect x="45.5" y="17.5" width="14" height="10" rx="3" fill="#38BDF8" fillOpacity="0.3" />
      {/* Pupila derecha */}
      <circle cx="52.5" cy="22.5" r="3.5" fill="#0F172A" />
      <circle cx="52.5" cy="22.5" r="2" fill="white" />
      <circle cx="53.5" cy="21.5" r="0.8" fill="#0F172A" />

      {/* Puente de los lentes */}
      <line x1="36" y1="22.5" x2="44" y2="22.5" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

      {/* Patillas */}
      <line x1="19" y1="22.5" x2="15" y2="22.5" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
      <line x1="61" y1="22.5" x2="65" y2="22.5" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

      {/* Boca / Sonrisa */}
      <path d="M31 36 Q40 41 49 36" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Cuerpo - detalles */}
      {/* Pantalla del pecho */}
      <rect x="25" y="38" width="30" height="18" rx="5" fill="#1D4ED8" />
      <rect x="27" y="40" width="26" height="14" rx="4" fill="#0EA5E9" fillOpacity="0.4" />

      {/* Indicador de estado */}
      <circle cx="33" cy="47" r="3" fill="#10B981" />
      <circle cx="40" cy="47" r="3" fill="#38BDF8" />
      <circle cx="47" cy="47" r="3" fill="#60A5FA" />

      {/* Brazos */}
      <rect x="5" y="33" width="10" height="20" rx="5" fill="#2563EB" />
      <rect x="65" y="33" width="10" height="20" rx="5" fill="#2563EB" />

      {/* Manos */}
      <circle cx="10" cy="54" r="4" fill="#1D4ED8" />
      <circle cx="70" cy="54" r="4" fill="#1D4ED8" />

      {/* Pies */}
      <rect x="22" y="66" width="14" height="8" rx="4" fill="#1D4ED8" />
      <rect x="44" y="66" width="14" height="8" rx="4" fill="#1D4ED8" />

      {/* Detalles brillantes */}
      <circle cx="55" cy="35" r="2" fill="#60A5FA" fillOpacity="0.6" />
      <circle cx="59" cy="31" r="1.5" fill="#38BDF8" fillOpacity="0.5" />
    </svg>
  )
}
