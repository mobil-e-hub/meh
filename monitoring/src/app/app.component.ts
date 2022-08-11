import {ChangeDetectorRef, Component, Inject, OnInit} from '@angular/core';
import {Service} from './Service';
import {EndpointsService} from './endpoints.service';
import {DOCUMENT} from '@angular/common';
import { webSocket } from "rxjs/webSocket";
import {AppConfigService} from "./AppConfigService";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'Monitoring';

  services: Service[];

  constructor(
    private endpointsService: EndpointsService,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private appConfigService: AppConfigService
  ) {
    this.services =  appConfigService.services;
  }

  ngOnInit(): void {
    this.checkServices();
    this.connectToWebsockets();
    setInterval(() => {
      this.checkServices();
      console.log(this.services);
    }, 10000);
  }

  connectToWebsockets(): void {
    for (const service of this.services) {
      if (service.path.startsWith('wss')) {
        const subject = webSocket(service.path);
        service.running = true;
        subject.subscribe(
          msg => console.log('message received: ' + msg), // Called whenever there is a message from the server.
          err => service.running = false, // Called if at any point WebSocket API signals some kind of error.
          () => service.running = false // Called when connection is closed (for whatever reason).
        );
      }
    }
    this.cdr.detectChanges();
  }

  checkServices(): void {
    for (const service of this.services) {
      if (service.path.startsWith('wss')) {
        continue
      }
      this.endpointsService.checkEndpoint(service.path).subscribe(response => {
        if (response['status'] === 200) {
          console.log('running');
          service.running = true;
        } else {
          console.log('not running');
          service.running = false;
        }
      }, error => {
        if (error['status'] === 200) {
          console.log('running');
          service.running = true;
        } else {
          console.log('not running');
          service.running = false;
        }
      });
    }
    this.cdr.detectChanges();
  }

  goToUrl(link: string): void {
    this.document.location.href = link;
  }
}
