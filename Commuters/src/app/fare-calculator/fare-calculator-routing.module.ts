import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FareCalculatorPage } from './fare-calculator.page';

const routes: Routes = [
  {
    path: '',
    component: FareCalculatorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FareCalculatorPageRoutingModule {}