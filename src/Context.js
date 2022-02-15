import React, { createContext, useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';

const SocketContext = createContext();

// const socket = io('http://localhost:5000');
// inicia contexto de socket.io
const socket = io('https://video-chat-app-sk.herokuapp.com');

const audio = new Audio('bell.mp3');

function play() {
  audio.play();
  audio.loop = true;
}

function pause() {
  audio.pause();
}

const ContextProvider = ({ children }) => {
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState('');
  const [call, setCall] = useState({});
  const [me, setMe] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    // Primeiro, queremos permissão para usar o vídeo e o áudio da câmera e do microfone do usuário
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        // imediatamente queremos preencher o iframe do vídeo com o src da nossa tela
        myVideo.current.srcObject = currentStream;
      });

    // ouvir uma ação específica
    socket.on('me', (id) => setMe(id));

    socket.on('callUser', ({ from, name: callerName, signal }) => {
      play();
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
  }, []);

  const answerCall = () => {
    pause();

    setCallAccepted(true);

    // pares de chamada de vídeo
    const peer = new Peer({ initiator: false, trickle: false, stream });

    // manipuladores de pares
    peer.on('signal', (data) => {
      socket.emit('answerCall', { signal: data, to: call.from });
    });

    peer.on('stream', (currentStream) => {
      // fluxo de outra pessoa
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    // conexão atual é igual ao par atual
    connectionRef.current = peer;
  };

  const callUser = (id) => {
    // iniciador: verdadeiro porque estamos chamando
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on('signal', (data) => {
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: me,
        name,
      });
    });

    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true);

      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    // destruir a referência atual, ou seja, parar de receber entrada da câmera e do áudio do usuário
    connectionRef.current.destroy();

    window.location.reload();
  };

  return (
    // Provedor dentro há valor que será globalmente acessível a todos os componentes
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        callUser,
        leaveCall,
        answerCall,
      }}
    >
      {/* Todos os componentes que temos lá estarão dentro do Socket envolvidos nele */}
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
