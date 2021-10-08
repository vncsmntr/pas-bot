const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const ytdl = require('ytdl-core');

const client = new Discord.Client();

const queue = new Map();

client.once('ready', () => {
    console.log('Pronto para ser usado');
});
client.once('reconnecting', () => {
    console.log('Reconectando');
});
client.once('disconnect', () => {
    console.log('Desconectado');
});

client.on('message', async message => {
    if(message.author.bot) return;
    if(!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);
    if(message.content.startsWith(`${prefix}play`)){
        execute(message, serverQueue);
        return;
    }else if(message.content.startsWith(`${prefix}skip`)){
        skip(message, serverQueue);
        return;
    }else if(message.content.startsWith(`${prefix}stop`)){
        stop(message, serverQueue);
        return;
    }else{
        message.channel.send("você precisa estar em um canal de voz!!")
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(' ');

    const voiceChannel = message.member.voice.channel;
    if(!voiceChannel)
        return message.channel.send(
            "você precisa estar em um canal de voz para tocar música"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if(!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "eu preciso de permissões para entrar e para falar no seu canal de voz!!"
        );
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if(!serverQueue) {
        const queueConstructor = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 10,
            playing: true
        }; 
        queue.set(message.guild.id, queueConstructor);
        
        queueConstructor.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstructor.connection = connection;
            play(message.guild, queueConstructor.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} foi adicionada a fila!`);
    }
}

function skip(message, serverQueue) {
    if(!message.member.voice.channel)
        return message.channel.send(
            "Voce precisa estar em um canal de voz para pular a musica!"
        );
    if(!serverQueue)
        return message.channel.send("não há musicas para pular!");
        serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if(!message.member.voice.channel)
        return message.channel.send(
            "Voce precisa estar em um canal de voz para parar a musica!"
        );
    if(!serverQueue)
        return message.channel.send("não há musicas para parar!");
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
}

    function play(guild, song) {
        const serverQueue = queue.get(guild.id);
        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return
        }
    const dispatcher = serverQueue.connection.play(ytdl(song.url)).on('terminou', () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    }).on("error", error => console.log(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 10);
    serverQueue.textChannel.send(`Começou a tocar: **${song.title}**`);
}

client.login(token);