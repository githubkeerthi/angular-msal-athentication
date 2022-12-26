import { NgModule, APP_INITIALIZER, InjectionToken } from '@angular/core';
import {
    MsalInterceptor,
    MsalModule,
    MsalService,
    MsalGuardConfiguration,
    MsalInterceptorConfiguration,
    MSAL_INSTANCE,
    MSAL_GUARD_CONFIG,
    MSAL_INTERCEPTOR_CONFIG
} from '@azure/msal-angular';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Configuration, InteractionType, IPublicClientApplication, LogLevel, PublicClientApplication } from '@azure/msal-browser';
import { ConfigService } from './config.service';

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1; // Remove this line to use Angular Universal

const AUTH_CONFIG_URL_TOKEN = new InjectionToken<string>('AUTH_CONFIG_URL');

export function initializerFactory(env: ConfigService, configUrl: string): any {
    // APP_INITIALIZER, except a function return which will return a promise
    // APP_INITIALIZER, angular doesnt starts application untill it completes
    const promise = env.init(configUrl).then((value) => {
        console.log(env.getSettings('clientID'));
    });
    return () => promise;
}

export function loggerCallback(logLevel: LogLevel, message: string) {
  console.log(message);
}

export function MSALInstanceFactory(config: ConfigService): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: config.getSettings('clientID'),
      authority: config.getSettings('authority'),
      redirectUri: config.getSettings('redirectUri')
  },
  cache: {
      cacheLocation: config.getSettings('cacheLocation')
  },
    system: {
      allowRedirectInIframe: true,
      loggerOptions: {
        loggerCallback,
        logLevel: LogLevel.Info,
        piiLoggingEnabled: false
      }
    }
  });
}

export function MSALInterceptorConfigFactory(config: ConfigService): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  // protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']); // Prod environment. Uncomment to use.
  protectedResourceMap: config.getSettings('protectedResourceMap')

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return { 
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: ['user.read']
    },
    loginFailedRoute: '/login-failed'
  };
}

@NgModule({
    providers: [
    ],
    imports: [MsalModule]
})
export class MsalApplicationModule {
    static forRoot(configFile: string) {
        return {
            ngModule: MsalApplicationModule,
            providers: [
                ConfigService,
                { provide: AUTH_CONFIG_URL_TOKEN, useValue: configFile },
                { provide: APP_INITIALIZER, useFactory: initializerFactory,
                     deps: [ConfigService, AUTH_CONFIG_URL_TOKEN], multi: true },
                     {
                        provide: HTTP_INTERCEPTORS,
                        useClass: MsalInterceptor,
                        multi: true
                      },
                      {
                        provide: MSAL_INSTANCE,
                        useFactory: MSALInstanceFactory,
                        deps: [ConfigService]
                      },
                      {
                        provide: MSAL_GUARD_CONFIG,
                        useFactory: MSALGuardConfigFactory,
                        deps: [ConfigService]
                      },
                      {
                        provide: MSAL_INTERCEPTOR_CONFIG,
                        useFactory: MSALInterceptorConfigFactory,
                        deps: [ConfigService]
                      },
            ]
        };
    }
}