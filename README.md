# 💻 **SHOOT - BACKEND**

## :key: **목표**
1. 큰 데이터들을 다루는 서버의 무결설을 보장하도록 설계해보기
2. Redis와 ElasticSearch, PostgreSQL 등을 한 번에 사용하는 대형 서버 제작해보고 기술 익히기

<br/>

## :open_file_folder: **폴더 구조**
```bash
├── config
├── module
├── public
│   └── index.html
├── routes
└── server.js
```

<br/>

## :floppy_disk: **사용 기술**
|이름|버전|사용 이유|
|------|---|---|
|ElasticSearch|7.17.8|게시글, 채널 검색을 빠르게 하기 위해서 사용함|
|Redis|5.0.7|삽입, 삭제가 빈번하게 일어나는 데이터들을 처리하기 위해 사용함|
|PostgreSQL|12.13|데이터의 안정성을 보장하기 위해 사용함|
|EC2 인스턴스| t2.small |배포를 위해서 사용함|

<br/>

## :eyes: **사이트 훑어보기**
* 사이트 이름 : **SHOOT**
* 사이트 내용 : 유튜브 쇼츠와 각종 커뮤니티를 합친 사이트이다. 1분 30초 미만의 영상을 메인으로 하는 게시글을 올릴 수 있고 볼 수 있다.