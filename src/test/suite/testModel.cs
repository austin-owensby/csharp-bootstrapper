public class TestModel
{
    public Guid ID { get; set; }
    public string Name { get; set; }
    public double Num { get; set; }
    public bool? flag { get; set; }
    public ChildClass ChildClass { get; set; }
    private void HelperMethod() { }
}

public class ChildClass
{
    public Guid ID { get; set; }
    public Guid TestModelID { get; set; }
    public TestModel TestModel { get; set; }
    public float ChildNum { get; set; }
    public List<bool> childFlags { get; set; }
    public List<Dictionary<float>> currencyMap { get; set; }
    public List<int?> nullableInts { get; set; }
}

public class Student
{
    public int StudentID { get; set; }
    public string StudentName { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public byte[]  Photo { get; set; }
    public decimal Height { get; set; }
    public float Weight { get; set; }
        
    public Grade Grade { get; set; }
}