import { supabase } from '@/lib/supabase';

export async function downloadDeliveryReceipt(bookingId: string) {
  const { data, error } = await supabase.rpc('delivery_receipt', { _booking_id: bookingId });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Receipt unavailable');
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.text('VAHAKAM', 18, 25);
  doc.setFontSize(14);
  doc.text('Proof of Delivery', 18, 36);
  doc.setFontSize(10);
  const rows = [
    ['Booking', data['booking_id']], ['Delivery verified', data['verified_at']],
    ['Shipper', data['shipper_name']], ['Driver', data['driver_name']], ['Vehicle', data['vehicle_number']],
    ['Pickup', data['pickup_location']], ['Delivery', data['drop_location']], ['Goods', data['material_type']],
    ['Weight (kg)', data['weight_kg']], ['Agreed fare (INR)', data['fare']], ['Trip date', data['trip_date']],
    ['Payment status', data['payment_status']],
  ];
  let y = 52;
  for (const [label, value] of rows) {
    const text = doc.splitTextToSize(String(value ?? 'Not recorded'), 118);
    doc.setFont('helvetica', 'bold'); doc.text(String(label), 18, y);
    doc.setFont('helvetica', 'normal'); doc.text(text, 76, y);
    y += Math.max(10, text.length * 5 + 5);
  }
  doc.text('Delivery confirmation only. This is not a payment receipt.', 18, y + 12);
  doc.save(`Vahakam-POD-${bookingId.slice(0, 8)}.pdf`);
}