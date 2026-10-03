import nodemailer from 'nodemailer';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Order, TableReservation } from '@/types';

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendOrderConfirmationEmail(order: Order, customerEmail: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP credentials not configured. Skipping order email.');
    return;
  }

  const from = process.env.MAIL_FROM || `"The Copper Leaf" <${process.env.SMTP_USER}>`;

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0eae1;">
          <strong>${item.quantity}x ${item.nameSnapshot}</strong>
          ${item.variantSnapshot ? `<br/><small style="color: #666;">Variant: ${item.variantSnapshot.name}</small>` : ''}
          ${item.modifierSnapshot?.length ? `<br/><small style="color: #666;">Addons: ${item.modifierSnapshot.map((m) => m.name).join(', ')}</small>` : ''}
          ${item.specialInstructions ? `<br/><small style="color: #C8622A;">Note: ${item.specialInstructions}</small>` : ''}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0eae1; text-align: right; vertical-align: top;">
          ${formatCurrency(item.unitPriceSnapshot * item.quantity)}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF6F0; margin: 0; padding: 24px; color: #1C1917;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E8E0D5;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #C8622A; margin: 0; font-size: 24px;">The Copper Leaf</h1>
            <p style="color: #78716C; margin: 4px 0 0 0; font-size: 14px;">Order Confirmation</p>
          </div>
          <div style="background-color: #FDF4ED; border-left: 4px solid #C8622A; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #1C1917;">
              Order <strong>${order.orderNumber}</strong> has been received!
            </p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #78716C;">
              Type: <strong>${order.orderType === 'DINE_IN' ? `Dine-In (Table ${order.tableNumberSnapshot || 'Assigned'})` : 'Takeaway (Parcel)'}</strong>
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="border-top: 2px solid #E8E0D5; padding-top: 12px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px;">
              <span>Subtotal:</span>
              <span>${formatCurrency(order.pricing.subtotal)}</span>
            </div>
            ${order.pricing.couponDiscount ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #16A34A;">
                <span>Discount (${order.pricing.couponCode || 'Coupon'}):</span>
                <span>-${formatCurrency(order.pricing.couponDiscount)}</span>
              </div>
            ` : ''}
            ${order.pricing.taxAmount ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px;">
                <span>Tax:</span>
                <span>${formatCurrency(order.pricing.taxAmount)}</span>
              </div>
            ` : ''}
            ${order.pricing.chargesAmount ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px;">
                <span>Charges:</span>
                <span>${formatCurrency(order.pricing.chargesAmount)}</span>
              </div>
            ` : ''}
            ${order.pricing.loyaltyValueRedeemed ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #C8622A;">
                <span>Loyalty Points Redeemed (${order.pricing.loyaltyPointsRedeemed} pts):</span>
                <span>-${formatCurrency(order.pricing.loyaltyValueRedeemed)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 18px; font-weight: bold; color: #C8622A;">
              <span>Total Paid / Payable:</span>
              <span>${formatCurrency(order.pricing.finalPayable)}</span>
            </div>
          </div>
          <p style="font-size: 12px; color: #A1A1AA; text-align: center; margin: 0;">
            Thank you for dining with The Copper Leaf. We hope you enjoy your meal!
          </p>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: customerEmail,
    subject: `Order Confirmation ${order.orderNumber} - The Copper Leaf`,
    html,
  });
}

export async function sendReservationConfirmationEmail(
  reservation: TableReservation,
  restaurantName: string,
  customerEmail: string
) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('SMTP credentials not configured. Skipping reservation email.');
    return;
  }

  const from = process.env.MAIL_FROM || `"The Copper Leaf" <${process.env.SMTP_USER}>`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF6F0; margin: 0; padding: 24px; color: #1C1917;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #E8E0D5;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #C8622A; margin: 0; font-size: 24px;">The Copper Leaf</h1>
            <p style="color: #78716C; margin: 4px 0 0 0; font-size: 14px;">Reservation Confirmed</p>
          </div>
          <div style="background-color: #FDF4ED; border-left: 4px solid #C8622A; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1C1917;">
              Dear ${reservation.customerName},
            </p>
            <p style="margin: 0; font-size: 14px; color: #44403C;">
              Your table has been reserved at <strong>${restaurantName}</strong>.
            </p>
          </div>
          <div style="border: 1px solid #E8E0D5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <div style="margin-bottom: 8px;"><strong>Booking Reference:</strong> ${reservation.reservationNumber}</div>
            <div style="margin-bottom: 8px;"><strong>Date & Time:</strong> ${formatDateTime(reservation.startAt)}</div>
            <div style="margin-bottom: 8px;"><strong>Table:</strong> Table #${reservation.tableNumberSnapshot || 'Reserved'}</div>
            <div style="margin-bottom: 8px;"><strong>Party Size:</strong> ${reservation.partySize} Guests</div>
            <div style="margin-bottom: 8px;"><strong>Duration:</strong> 3 Hours</div>
            <div><strong>Arrival Notice:</strong> Please check in within 60 minutes of your reservation time.</div>
          </div>
          <p style="font-size: 12px; color: #A1A1AA; text-align: center; margin: 0;">
            Need help or need to modify? Please contact our restaurant directly. We look forward to hosting you!
          </p>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to: customerEmail,
    subject: `Table Reservation Confirmed: ${reservation.reservationNumber} - The Copper Leaf`,
    html,
  });
}
