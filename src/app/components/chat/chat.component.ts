import { Component, OnInit } from '@angular/core';
import {Client} from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from 'src/app/models/mensaje';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  private client: Client;
  public conectado: Boolean = false;
  public mensaje: Mensaje = new Mensaje();
  public mensajes: Mensaje[] =[];
  public escribiendo: string;
  public clientId: string;

  constructor() {
    this.clientId = 'id-'+ new Date().getUTCMilliseconds() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit(): void {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      // Esta es la misma ruta que se declaró en el backend. (Clase WebSocketConfig)
      return new SockJS("http://localhost:8080/chat-websocket");
    }
    this.client.onConnect = (frame) => {

      console.log('Conectados: ' + this.client.connected + ' : ' + frame);
      this.conectado=true;

      // Nos sobscribimos.
      this.client.subscribe('/chat/mensaje', e => {
        // Escuchamos...
        let mensaje: Mensaje = JSON.parse(e.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);
        if(!this.mensaje.color && mensaje.type == 'NUEVO USUARIO' && this.mensaje.username == mensaje.username){
          this.mensaje.color = mensaje.color;
        }
        this.mensajes.push(mensaje);
        console.log(mensaje);
      });

      this.client.subscribe('/chat/escribiendo', e => {
        this.escribiendo=e.body;
        // Se hace que este texto aparezca por 5 segundos...
        // Esta función lo que hace es, luego de 3000 segundos resetea el atributo escribiendo.
        setTimeout(() => {this.escribiendo='';}, 3000);
      });

      this.client.subscribe('/chat/historial/'+this.clientId, e => {

        const historial = JSON.parse(e.body) as Mensaje[];

        this.mensajes = historial.map( mensaje =>  {
          mensaje.fecha = new Date(mensaje.fecha);
          return mensaje;
        }).reverse();

      });

      this.client.publish({
        destination: '/app/historial',
        body: this.clientId
      });

      this.mensaje.type='NUEVO USUARIO';
      this.client.publish(
        {
          // Esto se definió en la api, en la clase ChatController, la etiqueta @MessageMapping
          destination: '/app/mensaje',
          body: JSON.stringify(this.mensaje)
        }
      )


    }

    this.client.onDisconnect = (frame) => {
      console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);
      this.conectado=false;
      // Se resetean las instancias.
      this.mensaje = new Mensaje;
      this.mensajes = [];
    }

  }

  conectar(){
    this.client.activate();
  }

  desconectar(){
    this.client.deactivate();
  }

  enviarMensaje(): void {
    this.mensaje.type='MENSAJE';
    this.client.publish(
      {
        // Esto se definió en la api, en la clase ChatController, la etiqueta @MessageMapping
        destination: '/app/mensaje',
        body: JSON.stringify(this.mensaje)
      }
    )
    this.mensaje.texto = '';
  }

  escribiendoEvento(){
    this.client.publish(
      {
        // Esto se definió en la api, en la clase ChatController, la etiqueta @MessageMapping
        destination: '/app/escribiendo',
        body: this.mensaje.username
      }
    )
  }

}
