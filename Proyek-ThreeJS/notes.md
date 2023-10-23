Sudah :
- Deteksi collision antara 2 objek

TODO :

- [x] Kelas khusus untuk player 
- [X] Kelas khusus untuk DeathBox (Jika tabrakan dengan DeathBox, player mati)
- [X] Hit detection, jika player tabrakan deathbox apapun, trigger event
- [X] Event Reset objek (player)
- [X] Gerakan player tidak gemetaran/nyangkut2
- [X] Buat objek platform dengan tekstur yang repeat

- [ ] BUAT LEVEL
- [ ] Model/Tekstur DeathBox (jadi spike) + platform
- [ ] Ganti player model + tambah animasi pakai mixamo
- [ ] Implementasi aspek ThreeJs lain sesuai materi

Important notes :

- Event Listener in objects : https://stackoverflow.com/questions/70111463/method-not-defined-when-calling-from-inside-an-event-listener
- Jika ingin object tidak nyangkut2 saat bergerak, objek2 yang bersentuhan restitutionnya harus 0.
- BUG : Jika CANNON.Body awalnya dynamic lalu diubah jadi static, bisa ngebug