import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatToolbar} from "@angular/material/toolbar";
import {MatIcon} from "@angular/material/icon";


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatToolbar,
    MatIcon
  ]
})
export class AppModule { }
