import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FareCalculatorPageRoutingModule } from './fare-calculator-routing.module';
import { FareCalculatorPage } from './fare-calculator.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    FareCalculatorPageRoutingModule
  ],
  declarations: [FareCalculatorPage]
})
export class FareCalculatorPageModule {}