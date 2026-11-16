import truck from '@/assets/truck-3d.png';

export default function Truck3D({ className = 'w-56' }: { className?: string }) {
  return (
    <div className={`mx-auto ${className}`} aria-hidden="true">
      <img src={truck} alt="" width={1024} height={1024} className="truck-3d w-full h-auto select-none" draggable={false} />
      <div className="truck-shadow" />
    </div>
  );
}
