import { Component, HostBinding, NgZone, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { MatToolbar } from '@angular/material/toolbar';
import { MatCard, MatCardContent, MatCardModule } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput, MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerModule,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DecimalPipe, NgForOf, NgIf, SlicePipe } from '@angular/common';
import {
  MAT_DATE_LOCALE,
  MatNativeDateModule,
  DateAdapter,
  MAT_DATE_FORMATS,
  MatDateFormats,
} from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    MatCardModule,
    MatFormField,
    MatInput,
    MatInputModule,
    MatNativeDateModule,
    FormsModule,
    MatDatepickerModule,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepicker,
    MatButtonModule,
    MatProgressBarModule,
    MatLabel,
    NgIf,
    NgForOf,
    SlicePipe,
    DecimalPipe,
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
  progressValue: number = 0;
  logs: string[] = [];
  completedScreenshots: number = 0;
  totalScreenshots: number = 0;
  successCount: number = 0;
  totalCount: number = 0;

  @HostBinding('class') className = '';

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
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
    this.logs = [];
    this.screenshots = [];
    this.completedScreenshots = 0;
    this.totalScreenshots = 0;

    const formattedStartDate = this.formatDate(this.startDate);
    const formattedEndDate = this.formatDate(this.endDate);

    const domains = this.urls
      .split('\n')
      .map((url) => this.normalizeUrl(url.trim()))
      .filter((url) => url);

    const serverUrl = 'http://localhost:3000';

    this.http.post(`${serverUrl}/generate`, {
      domains,
      from: formattedStartDate,
      to: formattedEndDate,
    }).subscribe({
      next: () => {
        const eventSource = new EventSource(`${serverUrl}/progress`);

        eventSource.onmessage = (event) => {
          this.ngZone.run(() => {
            const data = JSON.parse(event.data);
            if (data.type === 'progress') {
              this.progressValue = (data.completed / data.total) * 100;
              this.completedScreenshots = data.completed;
              this.totalScreenshots = data.total;
            } else if (data.type === 'log') {
              this.logs.push(data.message);
            } else if (data.type === 'complete') {
              this.loading = false;
              this.progressValue = 100;
              this.completedScreenshots = data.total;
              this.totalScreenshots = data.total;
              this.screenshots = data.screenshots;
              this.showCompletionMessage(data.success, data.total);
              eventSource.close();
            }
          });
        };

        eventSource.onerror = (error) => {
          this.ngZone.run(() => {
            console.error('Ошибка SSE:', error);
            this.showErrorMessage('Произошла ошибка при получении данных с сервера.');
            this.loading = false;
            eventSource.close();
          });
        };
      },
      error: (err: HttpErrorResponse) => {
        console.error('Ошибка создания скриншотов:', err);
        const errorMessage = err.error?.error || 'Ошибка при создании скриншотов.';
        this.showErrorMessage(errorMessage);
        this.loading = false;
      },
    });
  }

  showCompletionMessage(success: number, total: number) {
    this.successCount = success;
    this.totalCount = total;
    const message = `Загрузка завершена. Успешно создано скриншотов: ${success} из ${total}.`;
    this.snackBar.open(message, 'Закрыть', {
      duration: 5000,
      verticalPosition: 'top',
    });
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

  normalizeUrl(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `http://${url}`;
    }
    return url;
  }

  formatTimestamp(timestamp: string): string {
    const year = parseInt(timestamp.substring(0, 4), 10);
    const month = parseInt(timestamp.substring(4, 6), 10) - 1;
    const day = parseInt(timestamp.substring(6, 8), 10);
    const hours = parseInt(timestamp.substring(8, 10), 10);
    const minutes = parseInt(timestamp.substring(10, 12), 10);
    const seconds = parseInt(timestamp.substring(12, 14), 10);

    const date = new Date(year, month, day, hours, minutes, seconds);

    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
