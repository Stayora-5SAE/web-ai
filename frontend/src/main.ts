import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { demoInterceptor } from './app/core/api.service';
import { APP_INITIALIZER } from '@angular/core';
import { IdentityService } from './app/accounts/identity.service';
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([demoInterceptor])),
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [IdentityService],
      useFactory: (identity: IdentityService) => () => identity.initialize(),
    },
  ],
}).catch(() => console.error('Stayora could not start.'));
