export const SimpleIcons = ({
  className,
  hex = '#00000',
  path,
  children,
  width = 24,
  height = 24
}: {
  className?: string;
  hex?: string;
  path?: string;
  children?: React.ReactNode;
  width?: number;
  height?: number;
}) => {
  return (
    <svg
      role='img'
      viewBox={`0 0 ${width} ${height}`}
      fill={`#${hex}`}
      className={className}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
    >
      {
        path ? <path d={path} /> : children
      }
    </svg>
  )
}
