import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-e-ticket',
  templateUrl: './e-ticket.component.html',
  styleUrls: ['./e-ticket.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ETicketComponent {
  @Input() visible: boolean = false;
  @Input() destination?: string | null = null;
  @Input() totalFare?: number | null = null;
  @Output() close = new EventEmitter<void>();

  private _reference?: number;
  private _issued?: Date;

  // simple payment option label; could be extended to use real payment methods
  paymentOption: string = 'Cash / Card';

  // stable reference and issued timestamp for the ticket instance
  get reference(): string {
    if (!this._reference) this._reference = Date.now();
    return String(this._reference);
  }

  get issuedFormatted(): string {
    if (!this._issued) this._issued = new Date();
    return this._issued.toLocaleString();
  }

  onClose() { this.close.emit(); }
}
