import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Mail Service - Gửi email qua SMTP (nodemailer).
 * Dùng cho: MFA OTP, Reset Password, Welcome Email.
 */
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');
    this.fromAddress = this.configService.get<string>(
      'mail.from',
      'noreply@cpahcm.vn',
    );

    // Chỉ khởi tạo transporter nếu có đủ thông tin SMTP
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('mail.port', 587),
        secure: false, // true for 465, false for other ports
        auth: { user, pass },
      });
      this.logger.log('Mail Service: Đã khởi tạo SMTP transporter');
    } else {
      this.logger.warn(
        'Mail Service: Thiếu cấu hình SMTP. Email sẽ được ghi log thay vì gửi thật.',
      );
    }
  }

  /**
   * Gửi email OTP cho MFA.
   */
  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = '[CPA HCM] Mã xác thực OTP của bạn';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CPA HCM Portal</h1>
          <p style="color: #bbdefb; margin: 8px 0 0;">Xác thực đa yếu tố (MFA)</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">Mã OTP của bạn là:</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a237e;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Mã này có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  /**
   * Gửi email reset password.
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const subject = '[CPA HCM] Đặt lại mật khẩu';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CPA HCM Portal</h1>
          <p style="color: #bbdefb; margin: 8px 0 0;">Đặt lại mật khẩu</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào nút bên dưới để tiếp tục:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #1a237e, #0d47a1); color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Hoặc copy link sau vào trình duyệt:</p>
          <p style="color: #1a237e; word-break: break-all; font-size: 13px;">${resetLink}</p>
          <p style="color: #666; font-size: 14px;">Link có hiệu lực trong <strong>15 phút</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  /**
   * Gửi email xác thực tài khoản sau đăng ký.
   */
  async sendVerificationEmail(to: string, verifyToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
    const subject = '[CPA HCM] Xác thực tài khoản email';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CPA HCM Portal</h1>
          <p style="color: #bbdefb; margin: 8px 0 0;">Chào mừng bạn!</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">Cảm ơn bạn đã đăng ký tài khoản. Vui lòng xác thực email:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background: linear-gradient(135deg, #2e7d32, #43a047); color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Xác thực Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Link có hiệu lực trong <strong>24 giờ</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  /**
   * Báo cho khách hàng (BUSINESS) khi Admin đổi trạng thái chứng từ họ đã tải lên — trước đây
   * không có bất kỳ thông báo nào, khách hàng phải tự vào lại Cổng Khách Hàng để biết chứng từ đã
   * được xử lý hay chưa.
   */
  async sendDocumentStatusEmail(
    to: string,
    fileName: string,
    status: 'PROCESSING' | 'COMPLETED' | 'REJECTED',
    reviewNote?: string | null,
  ): Promise<void> {
    const statusMeta: Record<string, { label: string; color: string }> = {
      PROCESSING: { label: 'Đang xử lý', color: '#0d47a1' },
      COMPLETED: { label: 'Hoàn tất', color: '#2e7d32' },
      REJECTED: { label: 'Từ chối', color: '#c62828' },
    };
    const meta = statusMeta[status];
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const subject = `[CPA HCM] Chứng từ "${fileName}" — ${meta.label}`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CPA HCM Portal</h1>
          <p style="color: #bbdefb; margin: 8px 0 0;">Cổng Khách Hàng</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">Chứng từ <strong>${fileName}</strong> bạn đã tải lên vừa được cập nhật trạng thái:</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
            <span style="font-size: 18px; font-weight: bold; color: ${meta.color};">${meta.label}</span>
          </div>
          ${reviewNote ? `<p style="color: #666; font-size: 14px;">Lý do: <strong>${reviewNote}</strong></p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/khach-hang" style="background: linear-gradient(135deg, #1a237e, #0d47a1); color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Xem Cổng Khách Hàng
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Email tự động, vui lòng không trả lời trực tiếp.</p>
        </div>
      </div>
    `;

    await this.sendMail(to, subject, html);
  }

  /** Báo khách hàng khi Admin đính kèm file kết quả (báo cáo/chứng từ đã xử lý) — riêng biệt với
   * sendDocumentStatusEmail vì việc gắn file có thể xảy ra độc lập với đổi trạng thái. */
  async sendDocumentResultEmail(to: string, fileName: string): Promise<void> {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const subject = `[CPA HCM] Kết quả xử lý chứng từ "${fileName}" đã sẵn sàng`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CPA HCM Portal</h1>
          <p style="color: #bbdefb; margin: 8px 0 0;">Cổng Khách Hàng</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">CPA HCM đã gửi kết quả xử lý cho chứng từ <strong>${fileName}</strong> bạn đã tải lên.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/khach-hang" style="background: linear-gradient(135deg, #1a237e, #0d47a1); color: #fff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Tải Kết Quả
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">Email tự động, vui lòng không trả lời trực tiếp.</p>
        </div>
      </div>
    `;
    await this.sendMail(to, subject, html);
  }

  /**
   * Gửi email chung qua SMTP hoặc log nếu chưa cấu hình.
   */
  private async sendMail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"CPA HCM Portal" <${this.fromAddress}>`,
          to,
          subject,
          html,
        });
        this.logger.log(`Email đã gửi tới: ${to} | Subject: ${subject}`);
      } catch (error) {
        this.logger.error(
          `Gửi email thất bại tới ${to}: ${(error as Error).message}`,
        );
        // Không throw error để không block flow chính
      }
    } else {
      // Fallback: Log nội dung email khi chưa cấu hình SMTP
      this.logger.warn(`[MAIL FALLBACK] To: ${to} | Subject: ${subject}`);
      this.logger.debug(
        `[MAIL FALLBACK] HTML content logged (SMTP not configured)`,
      );
    }
  }
}
