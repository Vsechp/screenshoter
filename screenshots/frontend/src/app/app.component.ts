import { Component, HostBinding, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { MatToolbar } from '@angular/material/toolbar';
import { MatCard, MatCardContent, MatCardModule } from '@angular/material/card'; // Добавлено MatCardModule
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerModule,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button'; // Изменено
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgForOf, NgIf, SlicePipe } from '@angular/common';
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  DateAdapter,
  MAT_DATE_FORMATS,
  MatDateFormats,
} from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgImageSliderModule } from 'ng-image-slider';

const MY_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
    HttpClientModule,
    MatToolbar,
    MatCard,
    MatCardContent,
    MatCardModule, // Добавлено
    MatFormField,
    MatInput,
    MatInputModule,
    MatNativeDateModule,
    FormsModule,
    MatDatepickerModule,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepicker,
    MatButtonModule, // Изменено
    MatProgressBarModule,
    MatLabel,
    NgIf,
    NgForOf,
    NgImageSliderModule,
    SlicePipe,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'ru-RU' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
  ],
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  urls: string = '';
  startDate: Date | null = null;
  endDate: Date | null = null;
  screenshots: { snapshotUrl: string; filePath: string; original: string; timestamp: string }[] = [];
  loading: boolean = false;
  imageObject: Array<object> = [];
  progressValue: number = 0;
  totalScreenshots: number = 0;

  @HostBinding('class') className = '';

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dateAdapter: DateAdapter<Date>
  ) {
    this.dateAdapter.setLocale('ru-RU');
  }

  ngOnInit() {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.setTheme(darkModeMediaQuery.matches ? 'dark-theme' : 'light-theme');
    darkModeMediaQuery.addEventListener('change', (e) => {
      this.setTheme(e.matches ? 'dark-theme' : 'light-theme');
    });
  }

  fetchAndGenerateScreenshots() {
    if (!this.urls.trim() || !this.startDate || !this.endDate) {
      this.showErrorMessage('Введите URL-адреса и выберите даты.');
      return;
    }

    this.loading = true;
    this.progressValue = 0;

    const formattedStartDate = this.formatDate(this.startDate);
    const formattedEndDate = this.formatDate(this.endDate);

    const domains = this.urls
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url);

    const serverUrl = 'http://localhost:3000/generate';

    this.http
      .post<{ total: number; screenshots: { snapshotUrl: string; filePath: string; original: string; timestamp: string }[] }>(
        serverUrl,
        {
          domains,
          from: formattedStartDate,
          to: formattedEndDate,
        }
      )
      .subscribe({
        next: (response) => {
          if (response.screenshots && Array.isArray(response.screenshots)) {
            this.screenshots = response.screenshots;
            this.prepareSliderImages();
            console.log('Screenshots received:', this.screenshots);
          } else {
            console.error('Unexpected response format:', response);
            this.showErrorMessage('Неверный формат данных от сервера.');
          }
          this.loading = false;
          this.progressValue = 100;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Ошибка создания скриншотов:', err);
          const errorMessage = err.error?.error || 'Ошибка при создании скриншотов.';
          this.showErrorMessage(errorMessage);
          this.loading = false;
          this.progressValue = 0;
        },
      });

    this.simulateProgress();
  }

  simulateProgress() {
    const progressInterval = setInterval(() => {
      if (this.progressValue < 90) {
        this.progressValue += Math.floor(Math.random() * 10) + 1;
        if (this.progressValue > 90) {
          this.progressValue = 90;
        }
      } else {
        clearInterval(progressInterval);
      }
    }, 1000);
  }

  prepareSliderImages() {
    this.imageObject = this.screenshots.map((screenshot) => ({
      image: screenshot.filePath,
      thumbImage: screenshot.filePath,
      alt: screenshot.original,
      title: `Ссылка: ${screenshot.original}\nДата: ${screenshot.timestamp}`,
    }));
  }

  showErrorMessage(message: string) {
    this.snackBar.open(message, 'Закрыть', {
      duration: 5000,
      verticalPosition: 'top',
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  setTheme(theme: string) {
    this.className = theme;
    document.body.className = theme;
  }

  openImage(filePath: string) {
    window.open(filePath, '_blank');
  }
}
