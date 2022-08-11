import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map, timeout} from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class EndpointsService {
  
  constructor(
    private http: HttpClient
  ) { }

  checkEndpoint(path: string): Observable<object> {
    return this.http.get<object>(path, { observe: 'response' }).pipe(
      timeout(3000)
  );
  }

}
