Sudah :
- Deteksi collision antara 2 objek

TODO :

- [x] Kelas khusus untuk player 
- [X] Kelas khusus untuk DeathBox (Jika tabrakan dengan DeathBox, player mati)
- [X] Hit detection, jika player tabrakan deathbox apapun, trigger event
- [X] Event Reset objek (player)
- [X] Gerakan player tidak gemetaran/nyangkut2
- [ ] Ubah kelas supaya hanya 2d (size y dan z = 1, size x bisa berubah)
- [ ] Ubah DeathBox supaya ukuran tetap 1x1x1 tapi berbentuk spike
- [ ] Buat objek platform dengan tekstur yang repeat (mungkin 1x1x1?)

- [ ] BUAT LEVEL


- [ ] Ganti player model + tambah animasi pakai mixamo
- [ ] Player bisa bergerak 3D (tidak hanya 2D) mengikuti rute tertentu dan tidak pergi dari rute tersebut.
- [ ] Kelas bounce pad :v


Important notes :

- Event Listener in objects : https://stackoverflow.com/questions/70111463/method-not-defined-when-calling-from-inside-an-event-listener
- Jika ingin object tidak nyangkut2 saat bergerak, objek2 yang bersentuhan restitutionnya harus 0.
- BUG : Jika CANNON.Body awalnya dynamic lalu diubah jadi static, bisa ngebug